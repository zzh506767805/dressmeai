import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { buffer } from "micro";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getPlanById, planIdToSubscriptionStatus, PlanId, PRICING_PLANS } from "@/lib/pricing";

export const config = {
  api: { bodyParser: false },
};

function getExpiryDate(): Date {
  const now = new Date();
  now.setMonth(now.getMonth() + 1);
  return now;
}

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

        if (session.mode === "subscription") {
          // Handle subscription checkout
          const planId = (session.metadata?.planId ?? "basic") as PlanId;
          const plan = getPlanById(planId);
          const userId = session.metadata?.userId;
          const cadence = session.metadata?.cadence ?? "monthly";

          if (!plan || !userId) {
            console.warn("Missing plan or userId in subscription checkout metadata");
            break;
          }

          const subscriptionId = session.subscription?.toString() ?? null;
          const newStatus = planIdToSubscriptionStatus(planId);

          let subscriptionExpiry = getExpiryDate();
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
              status: session.payment_status ?? "paid",
              amount: plan.monthlyAmount,
              currency: plan.currency,
            },
          });

          // Update user subscription + grant credits
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionStatus: newStatus as any,
              subscriptionExpiry,
              credits: plan.credits === -1 ? 999999 : cadence === "annual" ? plan.credits * 12 : plan.credits,
            },
          });

          const grantedCredits = plan.credits === -1 ? 'unlimited' : cadence === "annual" ? plan.credits * 12 : plan.credits;
          console.log(`User ${userId} subscribed to ${newStatus} with ${grantedCredits} credits (${cadence})`);
        } else if (session.mode === "payment") {
          // Handle single try-on payment (guest user)
          await prisma.payment.create({
            data: {
              stripeSessionId: session.id,
              stripeCustomerId: session.customer?.toString() ?? null,
              plan: "single",
              mode: "payment",
              status: session.payment_status ?? "paid",
              amount: 100,
              currency: "usd",
            },
          });
          console.log("Single try-on payment completed:", session.id);
        }
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
