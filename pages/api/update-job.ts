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

  const { jobId, status, resultImageUrl, modelImageUrl, clothImageUrl, taskId, errorMessage } = req.body;

  if (!jobId) {
    return res.status(400).json({ message: "Missing jobId" });
  }

  await prisma.tryOnJob.update({
    where: { id: jobId },
    data: {
      ...(status && { status }),
      ...(resultImageUrl && { resultImageUrl }),
      ...(modelImageUrl && { modelImageUrl }),
      ...(clothImageUrl && { clothImageUrl }),
      ...(taskId && { taskId }),
      ...(errorMessage && { errorMessage }),
    },
  });

  res.status(200).json({ success: true });
}
