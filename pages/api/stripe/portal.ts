import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
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

  const payment = await prisma.payment.findFirst({
    where: { userId: session.user.id, stripeCustomerId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!payment?.stripeCustomerId) {
    return res.status(400).json({ message: "No billing information found" });
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dressmeai.com";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: payment.stripeCustomerId,
      return_url: `${baseUrl}/account`,
    });

    res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error("Portal session error:", error);
    res.status(500).json({ message: "Failed to create portal session" });
  }
}
