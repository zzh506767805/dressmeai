import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob } from '@/lib/db';
import { getCloudflareEnv } from '@/lib/cloudflare';
import { failJob } from '@/lib/atomic';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).end();
  const { jobId, status } = req.body;
  if (typeof jobId !== 'string') return res.status(400).end();
  const job = await getJob(jobId, session.user.id);
  if (!job) return res.status(404).end();
  // Client timeouts cannot cancel an already submitted AI task or forge its
  // output URL. The server/cron recovers it after the browser disconnects.
  const refunded = status === 'FAILED' && job.status === 'PENDING'
    ? await failJob(getCloudflareEnv().DB, jobId, session.user.id, 'Image upload did not complete; credit refunded', 'PENDING') : false;
  return res.status(200).json({ success: true, refunded });
}
