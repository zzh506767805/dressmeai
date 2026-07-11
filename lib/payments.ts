import Stripe from "stripe";
import axios from "axios";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { uploadImageBuffer } from "@/lib/blob";
import {
  Cadence,
  getPlanById,
  getUnitAmount,
  planIdToSubscriptionStatus,
  PlanId,
} from "@/lib/pricing";

export type ProcessResult =
  | {
      status: "processed";
      mode: "subscription" | "payment";
      plan?: string;
      unlockedJobId?: string;
    }
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
    const cadence = (session.metadata?.cadence ?? "monthly") as Cadence;

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
          amount: session.amount_total ?? getUnitAmount(plan, cadence),
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

  // Single $1 payment: either unlocks an existing watermarked result (jobId in
  // metadata) or grants 1 credit for a fresh generation.
  const userId = session.metadata?.userId || null;
  const jobId = session.metadata?.jobId || null;

  try {
    await prisma.payment.create({
      data: {
        userId,
        stripeSessionId: session.id,
        stripeCustomerId: session.customer?.toString() ?? null,
        plan: jobId ? "single_unlock" : "single",
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

  if (userId && jobId) {
    const unlocked = await unlockJobOriginal(jobId, userId);
    if (unlocked) {
      console.log(`[payments] Unlock payment processed: ${session.id} job ${jobId}`);
      return { status: "processed", mode: "payment", unlockedJobId: jobId };
    }
    // Unlock impossible (job gone / original lost): fall back to granting the
    // credit so the user can regenerate — they must not pay for nothing.
    console.error(`[payments] Unlock failed for job ${jobId}, falling back to credit`);
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

// Swap a watermarked job's result to the clean original. Jobs created after the
// 2026-07 unlock change already have the original in our blob storage; older
// jobs point at the expiring DashScope OSS URL, which we try to re-host first.
async function unlockJobOriginal(jobId: string, userId: string): Promise<boolean> {
  const job = await prisma.tryOnJob.findFirst({
    where: { id: jobId, userId, status: "COMPLETED" },
  });
  if (!job?.originalImageUrl) return false;

  let cleanUrl = job.originalImageUrl;
  if (!cleanUrl.includes(".blob.core.windows.net/")) {
    try {
      const download = await axios.get<ArrayBuffer>(cleanUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });
      cleanUrl = await uploadImageBuffer(Buffer.from(download.data), "result-orig");
    } catch (e) {
      console.error(`[payments] Failed to re-host original for job ${jobId}:`, e);
      return false;
    }
  }

  await prisma.tryOnJob.update({
    where: { id: job.id },
    data: { resultImageUrl: cleanUrl, originalImageUrl: cleanUrl },
  });
  return true;
}
