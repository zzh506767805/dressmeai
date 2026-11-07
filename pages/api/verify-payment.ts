import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getJob } from '@/lib/db';
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

  const auth = await getServerSession(req, res, authOptions);
  if (!auth?.user?.id) return res.status(401).json({ message: 'Not authenticated' });
  const { session_id } = req.query;
  if (typeof session_id !== 'string') {
    return res.status(400).json({ message: "Missing session_id" });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id as string);

    if (session.metadata?.userId !== auth.user.id) return res.status(403).json({ message: 'Payment belongs to another account' });
    const result = await processCheckoutSession(session);

    switch (result.status) {
      case "not_paid":
        return res.status(200).json({ success: false, reason: "not_paid" });
      case "already_processed":
        const job = session.metadata?.jobId ? await getJob(session.metadata.jobId, auth.user.id) : null;
        // Re-derive the unlock target from checkout metadata so a /success
        // refresh still shows the unlocked image instead of trying to
        // regenerate with a credit that was never granted.
        return res.status(200).json({
          success: true,
          already_processed: true,
          unlockedJobId: job?.status === 'COMPLETED' && job.resultImageUrl === job.originalImageUrl ? job.id : undefined,
          source: session.metadata?.source || undefined,
        });
      case "missing_metadata":
        return res.status(200).json({ success: false, warning: "missing_metadata" });
      case "processed":
        return res.status(200).json({
          success: true,
          mode: result.mode,
          plan: result.plan,
          unlockedJobId: result.unlockedJobId,
          source: session.metadata?.source || undefined,
        });
    }
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
}
