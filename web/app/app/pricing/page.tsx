"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS, PlanId, PlanFeatureKey, FEATURE_LABELS } from "@/lib/plans";
import { useMockApi } from "@/lib/mock-api";
import { useToast } from "@/components/ui/toast";
import clsx from "clsx";
import { Check, ArrowLeft } from "lucide-react";

export default function PricingPage() {
  const router = useRouter();
  const { currentPlanId, setCurrentPlan } = useMockApi();
  const { addToast } = useToast();

  const handleSelect = (planId: PlanId) => {
    setCurrentPlan(planId);
    addToast({
      title: "Plan updated",
      description: `You're now on the ${PLANS.find(p => p.id === planId)?.name} plan.`,
    });
    router.push("/app/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Upgrade Your Plan</h1>
          <p className="text-sm text-slate-500">
            Choose a plan that fits your business needs.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isSelected = plan.id === currentPlanId;
          const bullets = Object.entries(plan.features)
            .filter(([, enabled]) => enabled)
            .map(([key]) => FEATURE_LABELS[key as PlanFeatureKey]);

          return (
            <Card
              key={plan.id}
              className={clsx(
                "relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm transition",
                isSelected
                  ? "border-emerald-600 ring-1 ring-emerald-500"
                  : "border-slate-200 hover:border-emerald-300"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 right-3 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Most popular
                </span>
              )}
              <div className="mb-2">
                <h3 className="text-sm font-semibold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500">{plan.tagline}</p>
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">{plan.priceLabel}</p>
              <p className="mt-1 text-[11px] text-slate-500">{plan.bestFor}</p>
              <ul className="mt-4 flex-grow space-y-2">
                {bullets.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {isSelected ? (
                  <button
                    className="w-full rounded-full border border-emerald-600 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700"
                    disabled
                  >
                    Current plan
                  </button>
                ) : (
                  <Button
                    className="w-full rounded-full px-3 py-2.5 text-xs font-semibold"
                    onClick={() => handleSelect(plan.id)}
                  >
                    {plan.id === "accountant" ? "Contact us" : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-50">
        <CardContent className="py-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            All plans include
          </h3>
          <ul className="grid gap-2 text-xs text-slate-600 md:grid-cols-2 lg:grid-cols-3">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Tax status check (eligibility)
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              FIRS-Ready dashboard
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Basic income & expense tracking
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Standard deadline alerts
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Education hub (English + Pidgin)
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              Mobile-friendly web app
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

