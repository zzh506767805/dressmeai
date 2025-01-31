import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

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

// 确保 URL 使用 HTTP
const ensureHttp = (url: string) => {
  return url.replace('https://', 'http://');
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Processing try-on request...');
    const { modelImageUrl, clothingImageUrl } = req.body;

    if (!modelImageUrl || !clothingImageUrl) {
      return res.status(400).json({ message: 'Both model and clothing image URLs are required' });
    }

    // 确保图片 URL 使用 HTTP
    const httpModelImageUrl = ensureHttp(modelImageUrl);
    const httpClothingImageUrl = ensureHttp(clothingImageUrl);

    console.log('Calling AI try-on API...');
    const response = await axiosInstance.post(`${API_HOST}${API_PATH}`, {
      model: "aitryon",
      input: {
        top_garment_url: httpClothingImageUrl,
        person_image_url: httpModelImageUrl,
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

    console.log('Try-on task created:', response.data.output?.task_id);
    return res.status(200).json({ taskId: response.data.output.task_id });
  } catch (error: any) {
    console.error('Try-on error:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to start try-on process';
    return res.status(500).json({ message: errorMessage });
  }
} 