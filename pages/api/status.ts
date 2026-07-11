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

// Free preview: only the top 30% stays visible (with a light tile so it is not
// a clean deliverable), the rest is blurred out under a dark "unlock" panel.
async function applyWatermark(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const meta = await image.metadata();
  const width = meta.width ?? 768;
  const height = meta.height ?? 1024;

  const coverTop = Math.round(height * 0.3);
  const coverHeight = height - coverTop;

  const blurred = await sharp(buffer)
    .extract({ left: 0, top: coverTop, width, height: coverHeight })
    .blur(30)
    .toBuffer();

  const tileFontSize = Math.round(width / 11);
  const tiles: string[] = [];
  for (let y = -height; y < height * 2; y += tileFontSize * 3) {
    for (let x = -width; x < width * 2; x += tileFontSize * 7) {
      tiles.push(`<text x="${x}" y="${y}" font-size="${tileFontSize}" fill="white" fill-opacity="0.18" font-family="Arial, sans-serif" font-weight="bold">DressMeAI</text>`);
    }
  }

  const lockSize = Math.round(width / 14);
  const lockX = width / 2;
  const lockY = coverTop + coverHeight / 2 - lockSize;
  const msgFontSize = Math.round(width / 20);
  const brandFontSize = Math.round(width / 26);

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><clipPath id="visible"><rect x="0" y="0" width="${width}" height="${coverTop}"/></clipPath></defs>
    <g clip-path="url(#visible)"><g transform="rotate(-30 ${width / 2} ${height / 2})">${tiles.join('')}</g></g>
    <rect x="0" y="${coverTop}" width="${width}" height="${coverHeight}" fill="black" fill-opacity="0.5"/>
    <g fill="none" stroke="white" stroke-width="${Math.max(3, Math.round(lockSize / 8))}">
      <path d="M ${lockX - lockSize / 2.8} ${lockY} v ${-lockSize / 2.2} a ${lockSize / 2.8} ${lockSize / 2.8} 0 0 1 ${lockSize / 1.4} 0 v ${lockSize / 2.2}"/>
    </g>
    <rect x="${lockX - lockSize / 1.6}" y="${lockY}" width="${lockSize * 1.25}" height="${lockSize}" rx="${lockSize / 8}" fill="white"/>
    <text x="${lockX}" y="${lockY + lockSize * 2}" text-anchor="middle" font-size="${msgFontSize}" fill="white" font-family="Arial, sans-serif" font-weight="bold">Unlock the full image</text>
    <text x="${lockX}" y="${lockY + lockSize * 2 + msgFontSize * 1.5}" text-anchor="middle" font-size="${brandFontSize}" fill="white" fill-opacity="0.85" font-family="Arial, sans-serif">DressMeAI.com</text>
  </svg>`;

  return image
    .composite([
      { input: blurred, top: coverTop, left: 0 },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

// Persist the DashScope result to our own blob storage (the OSS URL is http-only
// and expires within ~24h, so history entries would otherwise go dead), applying
// a watermark for free users. For watermarked results the clean original is also
// stored in blob, so a later $1 unlock just swaps pointers instead of racing the
// OSS expiry. Retries once; on total failure falls back to the original image
// (availability beats watermarking) and logs a searchable marker.
async function storeResult(
  originalUrl: string,
  watermark: boolean
): Promise<{ url: string; originalUrl: string; watermarked: boolean }> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const download = await axios.get<ArrayBuffer>(originalUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });
      const original = Buffer.from(download.data);
      if (!watermark) {
        const url = await uploadImageBuffer(original, 'result');
        return { url, originalUrl: url, watermarked: false };
      }
      const cleanUrl = await uploadImageBuffer(original, 'result-orig');
      const wmUrl = await uploadImageBuffer(await applyWatermark(original), 'result-wm');
      return { url: wmUrl, originalUrl: cleanUrl, watermarked: true };
    } catch (error: any) {
      console.error(`[RESULT_STORE_FAIL] attempt ${attempt}:`, error?.message || error);
    }
  }
  console.error('[RESULT_STORE_FALLBACK] serving original DashScope URL:', originalUrl);
  return { url: originalUrl, originalUrl, watermarked: false };
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
    // The watermarked flag is inferred from the blob name so a page refresh
    // keeps the unlock affordance visible.
    if (job.status === 'COMPLETED' && job.resultImageUrl) {
      return res.status(200).json({
        status: 'SUCCEEDED',
        imageUrl: job.resultImageUrl,
        watermarked: job.resultImageUrl.includes('result-wm'),
      });
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
      const finalResult = await storeResult(originalUrl, free);

      await prisma.tryOnJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          resultImageUrl: finalResult.url,
          originalImageUrl: finalResult.originalUrl,
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
