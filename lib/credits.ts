import { prisma } from '@/lib/db';

// Refund the credit consumed by a failed job. Idempotent: the creditRefunded
// flag guarantees at most one refund per job regardless of caller.
export async function refundJobCredit(jobId: string, userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const marked = await tx.tryOnJob.updateMany({
      where: { id: jobId, userId, creditRefunded: false },
      data: { creditRefunded: true },
    });
    if (marked.count === 0) return false;
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: 1 } },
    });
    return true;
  });
}

// True when the user has never completed a payment — their results get watermarked.
export async function isFreeUser(userId: string): Promise<boolean> {
  const paidCount = await prisma.payment.count({
    where: { userId, status: 'paid' },
  });
  return paidCount === 0;
}
