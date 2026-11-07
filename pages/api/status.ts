import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { refreshJob } from '@/lib/jobs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  if (typeof req.query.jobId !== 'string') return res.status(400).json({ message: 'Job ID is required' });
  try {
    const result = await refreshJob(req.query.jobId, session.user.id);
    return result ? res.status(200).json(result) : res.status(404).json({ message: 'Job not found' });
  } catch (error) {
    console.error('Status query failed', error instanceof Error ? error.message : 'unknown');
    return res.status(503).json({ status: 'PROCESSING', message: 'Result is being recovered. Please check your history shortly.' });
  }
}
