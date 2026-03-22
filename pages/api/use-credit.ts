import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, subscriptionStatus: true },
  });

  if (!user || user.credits <= 0) {
    return res.status(403).json({ message: "No credits remaining" });
  }

  // Deduct 1 credit atomically
  const updated = await prisma.user.updateMany({
    where: { id: session.user.id, credits: { gt: 0 } },
    data: { credits: { decrement: 1 } },
  });

  if (updated.count === 0) {
    return res.status(403).json({ message: "No credits remaining" });
  }

  // Create TryOnJob record
  const job = await prisma.tryOnJob.create({
    data: { userId: session.user.id, status: "PENDING" },
  });

  res.status(200).json({
    success: true,
    jobId: job.id,
    remainingCredits: user.credits - 1,
  });
}
