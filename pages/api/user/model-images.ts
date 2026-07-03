import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deleteBlobByUrl } from '@/lib/blob';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    const images = await prisma.savedModelImage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, imageUrl: true, createdAt: true },
    });
    return res.status(200).json({ images });
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    if (!id) {
      return res.status(400).json({ message: 'Missing id' });
    }
    const image = await prisma.savedModelImage.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!image) {
      return res.status(404).json({ message: 'Not found' });
    }
    await prisma.savedModelImage.delete({ where: { id: image.id } });
    await deleteBlobByUrl(image.imageUrl);
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
