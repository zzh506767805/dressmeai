import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundJobCredit } from "@/lib/credits";

const STALE_JOB_MINUTES = 15;

// Sweep jobs whose polling client died: anything stuck in PENDING/PROCESSING
// beyond the cutoff is failed and its credit refunded. Runs here because
// check-credits is always called right before a new generation starts.
async function sweepStaleJobs(userId: string) {
  const cutoff = new Date(Date.now() - STALE_JOB_MINUTES * 60 * 1000);
  const staleJobs = await prisma.tryOnJob.findMany({
    where: {
      userId,
      status: { in: ["PENDING", "PROCESSING"] },
      createdAt: { lt: cutoff },
    },
    select: { id: true },
  });
  for (const job of staleJobs) {
    await prisma.tryOnJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: "Generation timed out, credit refunded" },
    });
    await refundJobCredit(job.id, userId);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  await sweepStaleJobs(session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, subscriptionStatus: true, subscriptionExpiry: true },
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if subscription is expired
  const isExpired =
    user.subscriptionExpiry && new Date(user.subscriptionExpiry) < new Date();

  if (isExpired && user.subscriptionStatus !== "FREE") {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { subscriptionStatus: "FREE", subscriptionExpiry: null, credits: 0 },
    });
    return res.status(200).json({ credits: 0, subscriptionStatus: "FREE", hasCredits: false });
  }

  res.status(200).json({
    credits: user.credits,
    subscriptionStatus: user.subscriptionStatus,
    hasCredits: user.credits > 0,
  });
}
