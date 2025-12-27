"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { api } from "@/lib/api/client";

// Metadata moved to layout or handled client-side

interface Plan {
  id: string;
  name: string;
  description: string | null;
  monthlyPrice: number;
  planKey: string;
  features: Array<{
    featureKey: string;
    limitValue: number | null;
  }>;
}

const FEATURE_LABELS: Record<string, string> = {
  statement_import: "Statement import (CSV/Paste/PDF)",
  bank_connect: "Bank connection (read-only)",
  bank_auto_sync: "Automatic bank sync",
  yearEndFilingPack: "Year-end filing pack",
  guided_filing_wizard: "Guided filing wizard",
  email_notifications: "Email notifications",
  sms_notifications: "SMS notifications",
  multiWorkspaceView: "Multi-workspace view",
};

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const data = await api.get<Plan[]>("/plans", { skipAuth: true });
        setPlans(data || []);
      } catch {
        // Fallback to empty array if API fails
        setPlans([]);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);
  
  // Map plan keys to display names
  const planDisplayNames: Record<string, string> = {
    free: "Free",
    basic: "Basic",
    business: "Business",
    accountant: "Accountant",
  };

  // Default plan order
  const planOrder = ["free", "basic", "business", "accountant"];
  const sortedPlans = [...plans].sort((a, b) => {
    const aIdx = planOrder.indexOf(a.planKey);
    const bIdx = planOrder.indexOf(b.planKey);
    return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading pricing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Rorun"
              width={80}
              height={28}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-slate-600 hover:text-slate-900">
              Home
            </Link>
            <Link href="/help" className="text-slate-600 hover:text-slate-900">
              Help
            </Link>
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Pricing</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Choose a plan that fits your business needs. All plans include tax status check, obligations dashboard, and basic tracking.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {sortedPlans.map((plan) => {
            const featureKeys = plan.features.map((f) => f.featureKey);
            const isFree = plan.planKey === "free";
            const isAccountant = plan.planKey === "accountant";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${
                  plan.planKey === "business" ? "ring-2 ring-brand" : ""
                }`}
              >
                {plan.planKey === "business" && (
                  <span className="absolute -top-3 right-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                    Most popular
                  </span>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{planDisplayNames[plan.planKey] || plan.name}</CardTitle>
                  <div className="mt-2">
                    {isFree ? (
                      <div className="text-2xl font-bold text-slate-900">Free</div>
                    ) : isAccountant ? (
                      <div className="text-lg font-semibold text-slate-900">Contact us</div>
                    ) : (
                      <div>
                        <span className="text-2xl font-bold text-slate-900">
                          ₦{plan.monthlyPrice.toLocaleString()}
                        </span>
                        <span className="text-sm text-slate-600">/mo</span>
                      </div>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-slate-600 mt-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2">
                    {featureKeys.map((key) => (
                      <li key={key} className="flex items-start gap-2 text-sm text-slate-600">
                        <Check className="h-4 w-4 shrink-0 text-brand mt-0.5" />
                        <span>{FEATURE_LABELS[key] || key}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {isFree ? (
                      <Link href="/signup">
                        <Button className="w-full" variant="secondary">
                          Get started
                        </Button>
                      </Link>
                    ) : isAccountant ? (
                      <a href="mailto:support@rorun.ng">
                        <Button className="w-full" variant="secondary">
                          Contact us
                        </Button>
                      </a>
                    ) : (
                      <PlanSelectButton planKey={plan.planKey} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-slate-50">
          <CardContent className="py-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              All plans include
            </h3>
            <ul className="grid gap-2 text-sm text-slate-600 md:grid-cols-2 lg:grid-cols-3">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                Tax status check (eligibility)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                FIRS-Ready dashboard
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                Basic income & expense tracking
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                Standard deadline alerts
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                Education hub (English + Pidgin)
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                Mobile-friendly web app
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 border-t border-slate-200 mt-12">
        <div className="text-center text-sm text-slate-600">
          <p>Questions? <Link href="/help" className="text-brand hover:text-brand-dark">Visit our Help Center</Link> or <a href="mailto:support@rorun.ng" className="text-brand hover:text-brand-dark">contact support</a>.</p>
        </div>
      </footer>
    </div>
  );
}

function PlanSelectButton({ planKey }: { planKey: string }) {
  const router = useRouter();

  const handleClick = () => {
    // Check if user is logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("rorun_token") : null;
    
    if (token) {
      // User is logged in - redirect to settings
      router.push("/app/settings?tab=plan");
    } else {
      // User not logged in - redirect to signup
      router.push("/signup");
    }
  };

  return (
    <Button 
      onClick={handleClick} 
      className="w-full"
    >
      Choose plan
    </Button>
  );
}

