import type { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  resultUrl: string;
}

interface TaskResponse {
  output?: {
    task_status?: string;
    image_url?: string;
    message?: string;
  };
}

// API Configuration
const API_HOST = 'dashscope.aliyuncs.com';
const API_PATH = '/api/v1/services/aigc/image2image/image-synthesis';

// Compress image
async function compressImage(base64Image: string): Promise<string> {
  console.log('Starting image compression...');
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Image, 'base64');
  
  // Compress image
  const compressedBuffer = await sharp(buffer)
    .resize(800, 800, { // Resize to max 800x800
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ // Convert to JPEG
      quality: 80, // 80% quality
      progressive: true
    })
    .toBuffer();

  console.log('Image compression completed. Original size:', buffer.length, 'Compressed size:', compressedBuffer.length);
  // Convert back to base64
  return compressedBuffer.toString('base64');
}

// Upload image to ImgBB
async function uploadToImgBB(base64Image: string): Promise<string> {
  console.log('Starting image upload to ImgBB...');
  
  try {
    const url = `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`;
    const body = new URLSearchParams();
    body.append('image', base64Image);

    const response = await fetch(url, {
      method: 'POST',
      body: body.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`ImgBB API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('ImgBB response:', data);
    
    if (!data.success) {
      console.error('ImgBB upload failed:', data);
      throw new Error('Failed to upload image');
    }

    console.log('Image uploaded successfully. URL:', data.data.url);
    return data.data.url;
  } catch (error) {
    console.error('ImgBB upload error:', error);
    throw error;
  }
}

// Call AI try-on API
async function callTryOnAPI(modelImageUrl: string, clothingImageUrl: string): Promise<string> {
  console.log('Calling AI try-on API...');
  
  const requestBody = {
    model: "aitryon",
    input: {
      top_garment_url: clothingImageUrl,
      person_image_url: modelImageUrl,
    },
    parameters: {
      resolution: -1,
      restore_face: true
    }
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const response = await fetch(`https://${API_HOST}${API_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ALIYUN_API_KEY}`,
      'X-DashScope-Async': 'enable'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('AI API error:', text);
    throw new Error(`AI API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('AI API response:', data);

  if (!data.output?.task_id) {
    throw new Error('Invalid API response');
  }

  return data.output.task_id;
}

// Check task status
async function checkTaskStatus(taskId: string): Promise<TaskResponse> {
  console.log('Checking task status for:', taskId);
  
  const response = await fetch(`https://${API_HOST}/api/v1/tasks/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.ALIYUN_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to check task status');
  }

  const data = await response.json();
  console.log('Task status response:', data);

  return data;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  console.log('=== Starting generate API handler ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { modelImage, clothingImage } = req.body;

    if (!modelImage || !clothingImage) {
      return res.status(400).json({ message: 'Model and clothing images are required' });
    }

    // Remove base64 prefix and compress images
    console.log('Processing images...');
    const cleanModelImage = modelImage.replace(/^data:image\/\w+;base64,/, '');
    const cleanClothingImage = clothingImage.replace(/^data:image\/\w+;base64,/, '');

    const [compressedModelImage, compressedClothingImage] = await Promise.all([
      compressImage(cleanModelImage),
      compressImage(cleanClothingImage)
    ]);

    // Upload images to ImgBB
    console.log('Uploading images...');
    const [modelImageUrl, clothingImageUrl] = await Promise.all([
      uploadToImgBB(compressedModelImage),
      uploadToImgBB(compressedClothingImage)
    ]);

    // Start AI try-on task
    console.log('Starting AI try-on...');
    const taskId = await callTryOnAPI(modelImageUrl, clothingImageUrl);

    // Poll for task completion
    console.log('Polling for task completion...');
    let taskResult = null;
    let retryCount = 0;
    const maxRetries = 20;
    const retryInterval = 5000;

    while (retryCount < maxRetries) {
      console.log(`Checking task status (attempt ${retryCount + 1}/${maxRetries})...`);
      const taskData = await checkTaskStatus(taskId);

      if (taskData.output?.task_status === 'SUCCEEDED' && taskData.output?.image_url) {
        taskResult = taskData.output.image_url;
        break;
      } else if (taskData.output?.task_status === 'FAILED') {
        throw new Error(taskData.output.message || 'Generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, retryInterval));
      retryCount++;
    }

    if (taskResult) {
      console.log('Task completed successfully!');
      res.status(200).json({ resultUrl: taskResult });
    } else {
      throw new Error('Task timeout');
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
} 
