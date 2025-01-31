import { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import axios from 'axios';
import FormData from 'form-data';

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  url: string;
}

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  url: string;
}

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const UPLOAD_PRESET = 'ml_default1';

// 创建axios实例
const axiosInstance = axios.create({
  timeout: 30000,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Processing upload request...');
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Remove data:image/xxx;base64, prefix if exists
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log('Compressing image...');
    const compressedBuffer = await sharp(buffer)
      .resize(1024, 1024, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    // 转换为base64 URL格式
    const base64Url = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

    console.log('Preparing Cloudinary upload...');
    const formData = new FormData();
    // 直接使用 base64Url 作为文件数据
    formData.append('file', base64Url);
    formData.append('upload_preset', UPLOAD_PRESET);

    console.log('Sending request to Cloudinary...');
    console.log('Upload URL:', UPLOAD_URL);
    console.log('Upload preset:', UPLOAD_PRESET);

    const uploadResponse = await axiosInstance.post(UPLOAD_URL, formData, {
      headers: formData.getHeaders()
    });

    console.log('Cloudinary response:', JSON.stringify(uploadResponse.data, null, 2));

    // 优先使用 secure_url
    const imageUrl = uploadResponse.data.secure_url || uploadResponse.data.url;
    console.log('Final image URL:', imageUrl);

    return res.status(200).json({ url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    let errorMessage = 'Failed to upload image';
    
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      console.error('Axios error details:', {
        status: error.response?.status,
        data: responseData,
        headers: error.response?.headers
      });
      errorMessage = responseData?.error?.message || responseData?.message || error.message;
    }
    
    return res.status(500).json({ message: errorMessage });
  }
} 