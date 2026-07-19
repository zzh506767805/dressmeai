import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { refundJobCredit } from '@/lib/credits';

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  taskId: string;
}

const API_HOST = 'https://dashscope.aliyuncs.com';
const API_PATH = '/api/v1/services/aigc/image2image/image-synthesis';
const API_KEY = process.env.ALIYUN_API_KEY;

// 创建 axios 实例，增加超时时间
const axiosInstance = axios.create({
  timeout: 120000, // 120 秒
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'X-DashScope-Async': 'enable'
  }
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  let job: { id: string } | null = null;

  try {
    const { jobId, modelImageUrl, clothingImageUrl } = req.body;

    if (!jobId || !modelImageUrl || !clothingImageUrl) {
      return res.status(400).json({ message: 'jobId, model and clothing image URLs are required' });
    }

    // The job is the proof a credit was deducted (use-credit creates it).
    // It must belong to the caller and not have started an AI task yet.
    job = await prisma.tryOnJob.findFirst({
      where: {
        id: jobId,
        userId: session.user.id,
        status: { in: ['PENDING', 'PROCESSING'] },
        taskId: null,
      },
    });
    if (!job) {
      return res.status(403).json({ message: 'No eligible job for this request' });
    }

    const sanitizedModelUrl = String(modelImageUrl).trim();
    const sanitizedClothingUrl = String(clothingImageUrl).trim();

    const response = await axiosInstance.post(`${API_HOST}${API_PATH}`, {
      model: "aitryon",
      input: {
        top_garment_url: sanitizedClothingUrl,
        person_image_url: sanitizedModelUrl,
      },
      parameters: {
        resolution: -1,
        restore_face: true
      }
    });

    if (response.status !== 200) {
      const errorData = response.data;
      throw new Error(errorData.message || 'Failed to start try-on process');
    }

    const taskId: string = response.data.output.task_id;

    // Record the task server-side so status polling never depends on the client
    await prisma.tryOnJob.update({
      where: { id: job.id },
      data: {
        taskId,
        status: 'PROCESSING',
        modelImageUrl: sanitizedModelUrl,
        clothImageUrl: sanitizedClothingUrl,
      },
    });

    return res.status(200).json({ taskId });
  } catch (error: any) {
    console.error('Try-on error:', error);
    // DashScope errors carry a code + message (e.g. InvalidParameter.DataInspection);
    // keep both so failures can be attributed from the DB.
    const dsError = error.response?.data;
    const errorMessage = dsError?.code
      ? `${dsError.code}: ${dsError.message || ''}`.trim()
      : error.response?.data?.message || error.message || 'Failed to start try-on process';

    // Finalize the job server-side so the real reason survives even if the
    // client never reports back; refund is idempotent (creditRefunded flag).
    if (job) {
      await prisma.tryOnJob
        .update({ where: { id: job.id }, data: { status: 'FAILED', errorMessage } })
        .catch((e) => console.error('Failed to finalize job after try-on error:', e));
      await refundJobCredit(job.id, session.user.id).catch((e) =>
        console.error('Failed to refund credit after try-on error:', e)
      );
    }

    return res.status(500).json({ message: errorMessage });
  }
}
