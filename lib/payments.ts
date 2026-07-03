import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { getPlanById, planIdToSubscriptionStatus, PlanId } from "@/lib/pricing";

export type ProcessResult =
  | { status: "processed"; mode: "subscription" | "payment"; plan?: string }
  | { status: "already_processed" }
  | { status: "not_paid" }
  | { status: "missing_metadata" };

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Processes a completed Stripe Checkout session exactly once, shared by
// verify-payment (success-page polling) and the Stripe webhook. The unique
// constraint on Payment.stripeSessionId is the idempotency gate: whichever
// caller inserts the Payment row first also applies the credit/plan grant,
// the other gets "already_processed".
export async function processCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<ProcessResult> {
  if (session.payment_status !== "paid") {
    return { status: "not_paid" };
  }

  if (session.mode === "subscription") {
    const planId = (session.metadata?.planId ?? "basic") as PlanId;
    const plan = getPlanById(planId);
    const userId = session.metadata?.userId;
    const cadence = session.metadata?.cadence ?? "monthly";

    if (!plan || !userId) {
      return { status: "missing_metadata" };
    }

    const subscriptionId = session.subscription?.toString() ?? null;

    try {
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
    } catch (e) {
      if (isUniqueViolation(e)) return { status: "already_processed" };
      throw e;
    }

    let subscriptionExpiry = new Date();
    subscriptionExpiry.setMonth(subscriptionExpiry.getMonth() + 1);
    if (subscriptionId) {
      try {
        const sub = await getStripe().subscriptions.retrieve(subscriptionId);
        const periodEnd = (sub as any).current_period_end;
        if (typeof periodEnd === "number" && periodEnd > 0) {
          subscriptionExpiry = new Date(periodEnd * 1000);
        }
      } catch (e) {
        console.warn("Failed to retrieve subscription:", e);
      }
    }

    const newStatus = planIdToSubscriptionStatus(planId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: newStatus as any,
        subscriptionExpiry,
        credits:
          plan.credits === -1
            ? 999999
            : cadence === "annual"
            ? plan.credits * 12
            : plan.credits,
      },
    });

    console.log(`[payments] User ${userId} subscribed to ${newStatus}`);
    return { status: "processed", mode: "subscription", plan: plan.name };
  }

  // Single $1 try-on payment
  const userId = session.metadata?.userId || null;

  try {
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
  } catch (e) {
    if (isUniqueViolation(e)) return { status: "already_processed" };
    throw e;
  }

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: 1 } },
    });
  }

  console.log(`[payments] Single payment processed: ${session.id}`);
  return { status: "processed", mode: "payment" };
}
