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

  try {
    const session = await getServerSession(req, res, authOptions);
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dressmeai.com";

    // Optional: unlock an existing watermarked result instead of granting a
    // credit. Only honored when the job belongs to the caller and has a clean
    // original stored; otherwise the payment falls back to the credit flow.
    const jobId = typeof req.body?.jobId === "string" ? req.body.jobId : null;
    let unlockJobId: string | null = null;
    if (jobId && session?.user?.id) {
      const job = await prisma.tryOnJob.findFirst({
        where: { id: jobId, userId: session.user.id, status: "COMPLETED" },
        select: { id: true, originalImageUrl: true },
      });
      if (job?.originalImageUrl) unlockJobId = job.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: unlockJobId
              ? {
                  name: "Unlock HD Try-On Image",
                  description: "Remove the watermark from your try-on result",
                }
              : {
                  name: "Virtual Try-On Service",
                  description: "Generate your virtual try-on effect images",
                },
            unit_amount: 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        userId: session?.user?.id ?? null,
        ...(unlockJobId ? { jobId: unlockJobId } : {}),
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel`,
    });

    res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Payment session creation failed:", error);
    res.status(500).json({ message: "Failed to create payment session" });
  }
}
