import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { refundJobCredit } from "@/lib/credits";

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

  const { jobId, status, resultImageUrl, modelImageUrl, clothImageUrl, taskId, errorMessage } = req.body;

  if (!jobId) {
    return res.status(400).json({ message: "Missing jobId" });
  }

  const job = await prisma.tryOnJob.findFirst({
    where: { id: jobId, userId: session.user.id },
  });
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  // Finalized jobs stay finalized — a stale client can't flip COMPLETED to FAILED.
  const allowStatusChange =
    status && job.status !== "COMPLETED" && job.status !== "FAILED";

  await prisma.tryOnJob.update({
    where: { id: jobId },
    data: {
      ...(allowStatusChange && { status }),
      ...(resultImageUrl && { resultImageUrl }),
      ...(modelImageUrl && { modelImageUrl }),
      ...(clothImageUrl && { clothImageUrl }),
      ...(taskId && { taskId }),
      // errorMessage follows the same finalization rule: the server records the
      // real failure reason (tryon/status APIs) and a stale client's generic
      // message must not overwrite it.
      ...(allowStatusChange && errorMessage && { errorMessage }),
    },
  });

  let refunded = false;
  if (allowStatusChange && status === "FAILED") {
    refunded = await refundJobCredit(jobId, session.user.id);
  }

  res.status(200).json({ success: true, refunded });
}
