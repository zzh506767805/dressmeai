import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { getPlanById, getUnitAmount, getStripeInterval, Cadence } from "@/lib/pricing";
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
    return res.status(401).json({ message: "Please sign in first" });
  }

  const { planId, cadence = "annual" } = req.body as { planId: string; cadence?: Cadence };
  const plan = getPlanById(planId);

  if (!plan) {
    return res.status(400).json({ message: "Invalid plan" });
  }

  try {
    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://dressmeai.com";

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    let customerId: string | undefined;

    const existingPayment = await prisma.payment.findFirst({
      where: { userId: session.user.id, stripeCustomerId: { not: null } },
      orderBy: { createdAt: "desc" },
    });

    if (existingPayment?.stripeCustomerId) {
      customerId = existingPayment.stripeCustomerId;
    } else {
      const customer = await stripe.customers.create({
        email: user?.email || undefined,
        name: user?.name || undefined,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
    }

    const unitAmount = getUnitAmount(plan, cadence);
    const interval = getStripeInterval(cadence);

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&type=subscription`,
      cancel_url: `${baseUrl}/pricing?subscription=cancelled`,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
        cadence,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          planId: plan.id,
          cadence,
        },
      },
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: `DressMeAI ${plan.name} Plan (${cadence === "annual" ? "Annual" : "Monthly"})`,
              description: plan.description,
            },
            unit_amount: unitAmount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
    });

    res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Subscription checkout error:", error);
    res.status(500).json({ message: "Failed to create subscription session" });
  }
}
