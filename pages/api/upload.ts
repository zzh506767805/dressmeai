import { NextApiRequest, NextApiResponse } from 'next';
import sharp from 'sharp';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uploadImageBuffer, deleteBlobByUrl } from '@/lib/blob';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

interface ErrorResponse {
  message: string;
}

interface SuccessResponse {
  url: string;
}

const MAX_SAVED_MODELS = 3;

// Keep the user's most recent model photos for one-click reuse, capped at
// MAX_SAVED_MODELS (oldest entries and their blobs are evicted).
async function saveModelImage(userId: string, imageUrl: string) {
  await prisma.savedModelImage.create({ data: { userId, imageUrl } });
  const excess = await prisma.savedModelImage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip: MAX_SAVED_MODELS,
  });
  for (const item of excess) {
    await prisma.savedModelImage.delete({ where: { id: item.id } });
    await deleteBlobByUrl(item.imageUrl);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { image, saveAsModel } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // Remove data:image/xxx;base64, prefix if exists
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

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

    const url = await uploadImageBuffer(compressedBuffer, 'tryon');

    if (saveAsModel) {
      const session = await getServerSession(req, res, authOptions);
      if (session?.user?.id) {
        await saveModelImage(session.user.id, url).catch((err) => {
          console.error('Failed to save model image:', err);
        });
      }
    }

    return res.status(200).json({ url });
  } catch (error: any) {
    console.error('Upload error:', error);
    const errorMessage = error?.message || 'Failed to upload image';
    return res.status(500).json({ message: errorMessage });
  }
}
