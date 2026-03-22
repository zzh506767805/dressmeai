import Head from "next/head";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import UserMenu from "../components/UserMenu";

type Cadence = "monthly" | "annual";

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number; // cents
  annualPrice: number; // cents
  credits: number; // -1 = unlimited
  features: string[];
  badge?: string;
  highlight?: boolean;
}

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    description: "For regular fashion enthusiasts",
    monthlyPrice: 590,
    annualPrice: 5880,
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
    monthlyPrice: 1290,
    annualPrice: 11880,
    credits: 200,
    badge: "Popular",
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
    monthlyPrice: 2990,
    annualPrice: 29880,
    credits: -1,
    badge: "Best Value",
    highlight: true,
    features: [
      "Unlimited try-ons",
      "Highest resolution output",
      "Try-on history saved forever",
      "Fastest processing",
      "Priority support",
    ],
  },
];

function formatPrice(cents: number) {
  const dollars = cents / 100;
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}

export default function Pricing() {
  const { data: session } = useSession();
  const [cadence, setCadence] = useState<Cadence>("annual");
  const [loading, setLoading] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);

  const handleSubscribe = async (planId: string) => {
    if (!session) {
      signIn("google");
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, cadence }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.message || "Failed to create subscription");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const currentPlan = session?.user?.subscriptionStatus || "FREE";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Head>
        <title>Pricing - DressMeAI</title>
        <meta
          name="description"
          content="Choose a DressMeAI plan for AI virtual try-on. Basic, Pro, or Unlimited plans available."
        />
      </Head>

      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 mb-8">
          <Link href="/" className="text-4xl font-bold text-indigo-600">
            DressMeAI
          </Link>
          <UserMenu />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
            Upgrade for more try-ons and premium features. No account needed for
            single try-ons at $1 each.
          </p>

          {/* Cadence Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
            <button
              onClick={() => setCadence("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                cadence === "monthly"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCadence("annual")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                cadence === "annual"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Annual
              <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {plans.map((plan) => {
            const isCurrent =
              (currentPlan === plan.id.toUpperCase() ||
                (plan.id === "unlimited" && currentPlan === "PRO")) &&
              session;

            const price =
              cadence === "annual" ? plan.annualPrice : plan.monthlyPrice;
            const monthlyEquiv =
              cadence === "annual"
                ? Math.round(plan.annualPrice / 12)
                : plan.monthlyPrice;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${
                  plan.highlight
                    ? "bg-white ring-2 ring-indigo-600 shadow-xl scale-105"
                    : "bg-white ring-1 ring-gray-200 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}

                <h3 className="text-xl font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {plan.description}
                </p>

                <div className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(monthlyEquiv)}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>

                {cadence === "annual" && (
                  <p className="mt-1 text-sm text-gray-400">
                    {formatPrice(price)} billed annually
                  </p>
                )}

                <p className="mt-2 text-sm text-indigo-600 font-medium">
                  {plan.credits === -1
                    ? "Unlimited try-ons"
                    : `${plan.credits} try-ons / month`}
                </p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckIcon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={!!isCurrent || loading === plan.id}
                  className={`mt-8 w-full py-3 px-4 rounded-lg text-sm font-semibold transition-colors ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : plan.highlight
                      ? "bg-indigo-600 text-white hover:bg-indigo-700"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {loading === plan.id
                    ? "Processing..."
                    : isCurrent
                    ? "Current Plan"
                    : `Subscribe to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Single try-on option */}
        <div className="max-w-2xl mx-auto mb-16 text-center">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Just want to try once?
            </h3>
            <p className="text-gray-600 mb-4">
              Pay $1 per try-on with instant checkout.
            </p>
            <button
              onClick={async () => {
                setSingleLoading(true);
                try {
                  const res = await fetch("/api/create-payment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                  });
                  const data = await res.json();
                  if (data.url) {
                    window.location.href = data.url;
                  } else {
                    alert("Failed to create payment session");
                  }
                } catch {
                  alert("Something went wrong");
                } finally {
                  setSingleLoading(false);
                }
              }}
              disabled={singleLoading}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {singleLoading ? "Processing..." : "Pay $1 & Generate Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
