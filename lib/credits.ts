import { hasPaid } from '@/lib/db';
import { getCloudflareEnv } from './cloudflare';
import { refundFailedJob } from './atomic';

// Refund the credit consumed by a failed job. Idempotent: the creditRefunded
// flag guarantees at most one refund per job regardless of caller.
export async function refundJobCredit(jobId: string, userId: string): Promise<boolean> {
  return refundFailedJob(getCloudflareEnv().DB, jobId, userId);
}

// True when the user has never completed a payment — their results get watermarked.
export async function isFreeUser(userId: string): Promise<boolean> {
  return !(await hasPaid(userId));
}
