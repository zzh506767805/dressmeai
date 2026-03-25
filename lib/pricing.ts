export type PlanId = "basic" | "pro" | "unlimited";
export type Cadence = "monthly" | "annual";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  monthlyAmount: number; // cents per month (display price)
  annualAmount: number; // cents per year
  currency: string;
  badge?: string;
  highlight?: boolean;
  credits: number; // -1 = unlimited
  features: string[];
}

const appCurrency = process.env.STRIPE_CURRENCY || "usd";

export const PRICING_PLANS: PlanConfig[] = [
  {
    id: "basic",
    name: "Basic",
    description: "For regular fashion enthusiasts",
    monthlyAmount: 790, // $7.90/mo
    annualAmount: 6990, // $69.90/yr ($5.90/mo)
    currency: appCurrency,
    credits: 50,
    features: [
      "50 try-ons per month",
      "High resolution output",
      "Try-on history saved",
      "Priority processing",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For power users and creators",
    monthlyAmount: 1590, // $15.90/mo
    annualAmount: 15490, // $154.90/yr ($12.90/mo)
    currency: appCurrency,
    badge: "Popular",
    credits: 200,
    features: [
      "200 try-ons per month",
      "Highest resolution output",
      "Try-on history saved forever",
      "Fastest processing",
      "Priority support",
    ],
  },
  {
    id: "unlimited",
    name: "Unlimited",
    description: "No limits, for businesses and teams",
    monthlyAmount: 3990, // $39.90/mo
    annualAmount: 35890, // $358.90/yr ($29.90/mo)
    currency: appCurrency,
    badge: "Best Value",
    highlight: true,
    credits: -1, // unlimited
    features: [
      "Unlimited try-ons",
      "Highest resolution output",
      "Try-on history saved forever",
      "Fastest processing",
      "Priority support",
    ],
  },
];

// Single try-on price for non-logged-in users
export const SINGLE_TRYON_PRICE = 100; // $1.00

// Free credits on sign-up
export const FREE_SIGNUP_CREDITS = 2;

export function getPlanById(id: string): PlanConfig | undefined {
  return PRICING_PLANS.find((plan) => plan.id === id);
}

export function getUnitAmount(plan: PlanConfig, cadence: Cadence): number {
  return cadence === "annual" ? plan.annualAmount : plan.monthlyAmount;
}

export function getStripeInterval(cadence: Cadence): "month" | "year" {
  return cadence === "annual" ? "year" : "month";
}

export function planIdToSubscriptionStatus(planId: PlanId): string {
  switch (planId) {
    case "unlimited":
      return "PRO"; // Unlimited uses PRO status in DB
    case "pro":
      return "PRO";
    case "basic":
      return "BASIC";
    default:
      return "FREE";
  }
}
