import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  const page = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.tryOnJob.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        resultImageUrl: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.tryOnJob.count({ where: { userId: session.user.id } }),
  ]);

  res.status(200).json({ jobs, total, page, totalPages: Math.ceil(total / limit) });
}
