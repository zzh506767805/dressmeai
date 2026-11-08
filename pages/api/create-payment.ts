import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getUser, getJob } from "@/lib/db";
import { SINGLE_TRYON_PRICE } from "@/lib/pricing";

const ALLOWED_SOURCES = new Set(["generation_paywall", "pricing_single", "legacy_unlock"]);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Please sign in first" });
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXTAUTH_URL || "https://dressmeai.com";
    const requestedSource = typeof req.body?.source === "string" ? req.body.source : "";
    const source = ALLOWED_SOURCES.has(requestedSource)
      ? requestedSource
      : "pricing_single";
    const user = await getUser(session.user.id);

    // Optional: unlock an existing watermarked result instead of granting a
    // credit. Only honored when the job belongs to the caller and has a clean
    // original stored; otherwise the payment falls back to the credit flow.
    const jobId = typeof req.body?.jobId === "string" ? req.body.jobId : null;
    let unlockJobId: string | null = null;
    if (jobId) {
      const job = await getJob(jobId, session.user.id);
      if (job?.status === 'COMPLETED' && job.originalImageUrl) unlockJobId = job.id;
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
            unit_amount: SINGLE_TRYON_PRICE,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: user?.email || undefined,
      metadata: {
        project: "dressmeai",
        userId: session.user.id,
        source: unlockJobId ? "legacy_unlock" : source,
        ...(unlockJobId ? { jobId: unlockJobId } : {}),
      },
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?payment=cancelled#ai-fashion`,
    });

    res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Payment session creation failed:", error);
    res.status(500).json({ message: "Failed to create payment session" });
  }
}
