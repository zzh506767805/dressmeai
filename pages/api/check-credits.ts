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
