import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import sharp from 'sharp';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadImageBuffer } from '@/lib/blob';
import { refundJobCredit, isFreeUser } from '@/lib/credits';

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  status: string;
  imageUrl?: string;
  watermarked?: boolean;
}

// 阿里云 DashScope 配置
const API_HOST = 'https://dashscope.aliyuncs.com';
const API_KEY = process.env.ALIYUN_API_KEY;

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  let delay = initialDelay;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.log(`Status check attempt ${i + 1} failed:`, error.message);

      if (error.code === 'ECONNRESET') {
        delay = Math.min(delay * 2, 5000);
      }

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

async function applyWatermark(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const width = meta.width ?? 768;
  const height = meta.height ?? 1024;

  const tileFontSize = Math.round(width / 11);
  const brandFontSize = Math.round(width / 22);
  const rows: string[] = [];
  const stepY = tileFontSize * 4;
  const stepX = tileFontSize * 8;
  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      rows.push(`<text x="${x}" y="${y}" font-size="${tileFontSize}" fill="white" fill-opacity="0.16" font-family="Arial, sans-serif" font-weight="bold">DressMeAI</text>`);
    }
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-30 ${width / 2} ${height / 2})">${rows.join('')}</g>
    <text x="${width - 16}" y="${height - 20}" text-anchor="end" font-size="${brandFontSize}" fill="white" fill-opacity="0.9" font-family="Arial, sans-serif" font-weight="bold" stroke="black" stroke-opacity="0.25" stroke-width="1">DressMeAI.com</text>
  </svg>`;

  return image
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Watermark the DashScope result and persist it to our blob storage.
// Retries once; on total failure falls back to the original image (availability
// beats watermarking) and logs a searchable alert marker.
async function watermarkAndStore(originalUrl: string): Promise<{ url: string; watermarked: boolean }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const download = await axios.get<ArrayBuffer>(originalUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const watermarkedBuffer = await applyWatermark(Buffer.from(download.data));
      const url = await uploadImageBuffer(watermarkedBuffer, 'result-wm');
      return { url, watermarked: true };
    } catch (error: any) {
      console.error(`[WATERMARK_FAIL] attempt ${attempt}:`, error?.message || error);
    }
  }
  console.error('[WATERMARK_FALLBACK] serving original image without watermark:', originalUrl);
  return { url: originalUrl, watermarked: false };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const { jobId } = req.query;
  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ message: 'Job ID is required' });
  }

  try {
    const job = await prisma.tryOnJob.findFirst({
      where: { id: jobId, userId: session.user.id },
    });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Already finalized: return the stored result, never re-run watermarking.
    if (job.status === 'COMPLETED' && job.resultImageUrl) {
      return res.status(200).json({ status: 'SUCCEEDED', imageUrl: job.resultImageUrl });
    }
    if (job.status === 'FAILED') {
      return res.status(200).json({ status: 'FAILED' });
    }
    if (!job.taskId) {
      return res.status(200).json({ status: 'PENDING' });
    }

    if (!API_KEY) {
      throw new Error('ALIYUN_API_KEY not configured');
    }

    const response = await retryOperation(() =>
      axiosInstance.get(`${API_HOST}/api/v1/tasks/${job.taskId}`)
    );

    const data = response.data;
    if (!data.output?.task_status) {
      throw new Error('Invalid status response');
    }
    const taskStatus: string = data.output.task_status;

    if (taskStatus === 'SUCCEEDED' && data.output.image_url) {
      const originalUrl: string = data.output.image_url;
      const free = await isFreeUser(session.user.id);
      const finalResult = free
        ? await watermarkAndStore(originalUrl)
        : { url: originalUrl, watermarked: false };

      await prisma.tryOnJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          resultImageUrl: finalResult.url,
          originalImageUrl: originalUrl,
        },
      });

      return res.status(200).json({
        status: 'SUCCEEDED',
        imageUrl: finalResult.url,
        watermarked: finalResult.watermarked,
      });
    }

    if (taskStatus === 'FAILED') {
      await prisma.tryOnJob.update({
        where: { id: job.id },
        data: { status: 'FAILED', errorMessage: data.output.message || 'AI generation failed' },
      });
      await refundJobCredit(job.id, session.user.id);
      return res.status(200).json({ status: 'FAILED' });
    }

    return res.status(200).json({ status: taskStatus });
  } catch (error: any) {
    console.error('Status check error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to check task status';
    return res.status(500).json({ message: errorMessage });
  }
}
