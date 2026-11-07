import type { NextApiRequest, NextApiResponse } from 'next';
import { recoverJobs } from '@/lib/jobs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.RECOVERY_SECRET || req.headers['x-recovery-secret'] !== process.env.RECOVERY_SECRET) return res.status(401).end();
  return res.status(200).json({ checked: await recoverJobs() });
}
