import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { buffer } from "micro";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getPlanById, planIdToSubscriptionStatus, PlanId, PRICING_PLANS } from "@/lib/pricing";
import { processCheckoutSession } from "@/lib/payments";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return res.status(500).json({ message: "Webhook secret missing" });
  }

  try {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"]!;
    const event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Shared, idempotent processor (also used by verify-payment polling):
        // grants credits/plan exactly once no matter which path runs first.
        const result = await processCheckoutSession(session);
        console.log(`[webhook] checkout.session.completed: ${result.status}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const payment = await prisma.payment.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (payment?.userId) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: subscription.status },
          });

          const periodEnd = (subscription as any).current_period_end;
          let newExpiry: Date | null = null;
          if (typeof periodEnd === "number" && periodEnd > 0) {
            newExpiry = new Date(periodEnd * 1000);
          }

          // Determine plan from metadata
          const metadataPlanId = subscription.metadata?.planId as PlanId | undefined;
          const plan = metadataPlanId ? getPlanById(metadataPlanId) : null;

          if (subscription.status === "active" || subscription.status === "trialing") {
            const updateData: any = {};
            if (newExpiry) updateData.subscriptionExpiry = newExpiry;
            if (plan) {
              updateData.subscriptionStatus = planIdToSubscriptionStatus(plan.id as PlanId);
              updateData.credits = plan.credits === -1 ? 999999 : plan.credits;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.user.update({
                where: { id: payment.userId },
                data: updateData,
              });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const payment = await prisma.payment.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (payment?.userId) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: subscription.status },
          });

          await prisma.user.update({
            where: { id: payment.userId },
            data: {
              subscriptionStatus: "FREE",
              subscriptionExpiry: null,
              credits: 0,
            },
          });

          console.log(`User ${payment.userId} downgraded to FREE`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Renewal: reset credits
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;

        if (subscriptionId && invoice.billing_reason === "subscription_cycle") {
          const payment = await prisma.payment.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (payment?.userId) {
            // Find plan from the payment record's plan name
            const plan = PRICING_PLANS.find((p) => p.name === payment.plan);

            if (plan) {
              await prisma.user.update({
                where: { id: payment.userId },
                data: { credits: plan.credits === -1 ? 999999 : plan.credits },
              });
              console.log(`Renewed credits for user ${payment.userId}: ${plan.credits}`);
            }
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof (invoice as any).subscription === "string"
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id;

        if (subscriptionId) {
          const payment = await prisma.payment.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });
          if (payment) {
            console.warn(`Payment failed for user ${payment.userId}`);
          }
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({ message: "Webhook verification failed" });
  }
}
