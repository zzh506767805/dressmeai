import { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";
import { processCheckoutSession } from "@/lib/payments";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { session_id } = req.query;
  if (!session_id) {
    return res.status(400).json({ message: "Missing session_id" });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id as string);

    const result = await processCheckoutSession(session);

    switch (result.status) {
      case "not_paid":
        return res.status(200).json({ success: false, reason: "not_paid" });
      case "already_processed":
        // Re-derive the unlock target from checkout metadata so a /success
        // refresh still shows the unlocked image instead of trying to
        // regenerate with a credit that was never granted.
        return res.status(200).json({
          success: true,
          already_processed: true,
          unlockedJobId: session.metadata?.jobId || undefined,
        });
      case "missing_metadata":
        return res.status(200).json({ success: true, warning: "missing_metadata" });
      case "processed":
        return res.status(200).json({
          success: true,
          mode: result.mode,
          plan: result.plan,
          unlockedJobId: result.unlockedJobId,
        });
    }
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
}
