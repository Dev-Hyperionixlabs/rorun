"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlanId } from "@/lib/plans";

export function LockedFeature({
  title = "Feature locked",
  requiredPlan,
  details,
}: {
  title?: string;
  requiredPlan: PlanId | null;
  details?: string;
}) {
  const planLabel =
    requiredPlan === "basic"
      ? "Basic"
      : requiredPlan === "business"
      ? "Business"
      : requiredPlan === "accountant"
      ? "Accountant"
      : "a higher";

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
      <p className="font-semibold text-amber-900 mb-2">{title}</p>
      <p className="text-amber-700 mb-3">
        {details ?? `This feature requires the ${planLabel} plan.`}
      </p>
      <div className="flex items-center gap-3">
        <Link href="/app/settings?tab=plan">
          <Button size="sm">Upgrade plan</Button>
        </Link>
        <Link className="text-sm text-slate-600 hover:text-slate-900" href="/app/settings?tab=plan">
          View plans
        </Link>
      </div>
    </div>
  );
}


