import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob, claimJob, recordTask, ownsSavedModel } from '@/lib/db';
import { getCloudflareEnv } from '@/lib/cloudflare';
import { failJob } from '@/lib/atomic';
import { submitTryon } from '@/lib/tryon-provider';
import { storedImageKey } from '@/lib/blob';

async function validateInput(raw: unknown, userId: string): Promise<string> {
  if (typeof raw !== 'string' || raw.length > 2048) throw new Error('Invalid input image');
  const url = new URL(raw, process.env.NEXTAUTH_URL);
  const key = storedImageKey(url.href);
  if (key?.startsWith(`users/${userId}/tryon-`)) return url.href;
  if (key?.startsWith('legacy/')) {
    const owned = await ownsSavedModel(url.href, userId);
    if (owned) return url.href;
  }
  const base = new URL(process.env.NEXTAUTH_URL!);
  if (url.origin === base.origin && /^\/(garments|images\/models)\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(url.pathname)) return url.href;
  throw new Error('Please select one of your uploaded images or a sample image');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  const { jobId, modelImageUrl, clothingImageUrl } = req.body;
  if (typeof jobId !== 'string') return res.status(400).json({ message: 'Job ID is required' });
  const job = await getJob(jobId, session.user.id);
  if (!job || job.status === 'FAILED' || job.status === 'COMPLETED') return res.status(403).json({ message: 'No eligible job' });
  if (job.taskId) return res.status(200).json({ taskId: job.taskId });
  let claimed = false;
  try {
    const modelUrl = await validateInput(modelImageUrl, session.user.id);
    const clothingUrl = await validateInput(clothingImageUrl, session.user.id);
    if (!(await claimJob(jobId, session.user.id, modelUrl, clothingUrl))) return res.status(202).json({ status: 'PROCESSING' });
    claimed = true;
    const response = await submitTryon(modelUrl, clothingUrl);
    const taskId = response.output?.task_id;
    if (typeof taskId !== 'string') throw new Error('AI did not return a task ID');
    await recordTask(jobId, taskId);
    return res.status(200).json({ taskId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start generation';
    if (claimed || job.status === 'PENDING') await failJob(getCloudflareEnv().DB, jobId, session.user.id, message, claimed ? 'PROCESSING' : 'PENDING');
    return res.status(500).json({ message });
  }
}
