import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Proxies a try-on result as a real file download. Needed because result images
// live on external hosts (Azure Blob / DashScope OSS) where a plain link either
// opens a blank tab or can't carry a Content-Disposition we control.
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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

  const job = await prisma.tryOnJob.findFirst({
    where: { id: jobId, userId: session.user.id },
    select: { resultImageUrl: true },
  });
  if (!job?.resultImageUrl) {
    return res.status(404).json({ message: 'Result not found' });
  }

  try {
    const download = await axios.get<ArrayBuffer>(job.resultImageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    const buffer = Buffer.from(download.data);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="dressmeai-tryon-${jobId}.jpg"`);
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error('Download proxy error:', error?.message || error);
    return res.status(502).json({ message: 'Failed to fetch result image' });
  }
}
