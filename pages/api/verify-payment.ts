import { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getPlanById, planIdToSubscriptionStatus, PlanId } from "@/lib/pricing";

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

    if (session.payment_status !== "paid") {
      return res.status(200).json({ success: false, reason: "not_paid" });
    }

    // Check if already processed (idempotent)
    const existing = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (existing) {
      return res.status(200).json({ success: true, already_processed: true });
    }

    if (session.mode === "subscription") {
      // Subscription payment
      const planId = (session.metadata?.planId ?? "basic") as PlanId;
      const plan = getPlanById(planId);
      const userId = session.metadata?.userId;
      const cadence = session.metadata?.cadence ?? "monthly";

      if (!plan || !userId) {
        return res.status(200).json({ success: true, warning: "missing_metadata" });
      }

      const subscriptionId = session.subscription?.toString() ?? null;
      const newStatus = planIdToSubscriptionStatus(planId);

      // Get expiry from Stripe subscription
      let subscriptionExpiry = new Date();
      subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 1);

      if (subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const periodEnd = (sub as any).current_period_end;
          if (typeof periodEnd === "number" && periodEnd > 0) {
            subscriptionExpiry = new Date(periodEnd * 1000);
          }
        } catch (e) {
          console.warn("Failed to retrieve subscription:", e);
        }
      }

      // Create payment record
      await prisma.payment.create({
        data: {
          userId,
          stripeSessionId: session.id,
          stripeCustomerId: session.customer?.toString() ?? null,
          stripeSubscriptionId: subscriptionId,
          plan: plan.name,
          mode: "subscription",
          status: "paid",
          amount: plan.monthlyAmount,
          currency: plan.currency,
        },
      });

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: newStatus as any,
          subscriptionExpiry,
          credits: plan.credits === -1 ? 999999 : cadence === "annual" ? plan.credits * 12 : plan.credits,
        },
      });

      console.log(`[verify] User ${userId} subscribed to ${newStatus}`);
      return res.status(200).json({ success: true, mode: "subscription", plan: plan.name });

    } else {
      // Single payment ($1 try-on)
      const userId = session.metadata?.userId ?? null;

      await prisma.payment.create({
        data: {
          userId,
          stripeSessionId: session.id,
          stripeCustomerId: session.customer?.toString() ?? null,
          plan: "single",
          mode: "payment",
          status: "paid",
          amount: 100,
          currency: "usd",
        },
      });

      // If logged-in user did single payment, grant 1 credit
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: { credits: { increment: 1 } },
        });
      }

      console.log(`[verify] Single payment processed: ${session.id}`);
      return res.status(200).json({ success: true, mode: "payment" });
    }
  } catch (error) {
    console.error("Payment verification failed:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
}
