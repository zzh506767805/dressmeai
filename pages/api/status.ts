import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  status: string;
  imageUrl?: string;
}

// 阿里云 DashScope 配置
const API_HOST = 'https://dashscope.aliyuncs.com';
const API_KEY = process.env.ALIYUN_API_KEY;

// 创建 axios 实例
const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// 确保 URL 使用 HTTP
const ensureHttp = (url: string) => {
  return url ? url.replace('https://', 'http://') : url;
};

// 重试函数
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
        delay = Math.min(delay * 2, 5000); // 最大延迟5秒
      }

      if (i < maxRetries - 1) {
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Processing status check request...');
    const { taskId } = req.query;

    if (!taskId || typeof taskId !== 'string') {
      return res.status(400).json({ message: 'Task ID is required' });
    }

    if (!API_KEY) {
      throw new Error('ALIYUN_API_KEY not configured');
    }

    console.log('Checking task status:', taskId);
    const response = await retryOperation(() =>
      axiosInstance.get(`${API_HOST}/api/v1/tasks/${taskId}`)
    );

    const data = response.data;
    console.log('Status response:', data);

    if (!data.output?.task_status) {
      throw new Error('Invalid status response');
    }

    const result: SuccessResponse = {
      status: data.output.task_status
    };

    if (data.output.task_status === 'SUCCEEDED' && data.output.image_url) {
      // 确保返回的图片 URL 使用 HTTP
      result.imageUrl = ensureHttp(data.output.image_url);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Status check error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to check task status';
    return res.status(500).json({ message: errorMessage });
  }
} 