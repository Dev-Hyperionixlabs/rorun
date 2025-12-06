"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useMockApi } from "@/lib/mock-api";
import { computeTaxSafetyScoreFromMock } from "@/lib/tax-safety";
import { computeRecommendedActionsMock } from "@/lib/recommended-actions";
import { useRecommendedActionsApi } from "@/hooks/use-recommended-actions";
import { useFilingPack } from "@/hooks/use-filing-pack";

export function RecommendedActionsSection() {
  const router = useRouter();
  const { businesses, transactions, currentPlanId } = useMockApi();
  const business = businesses[0];
  const year = new Date().getFullYear();
  const { pack, generate, isLoading: packLoading } = useFilingPack(business.id, year);
  const [packError, setPackError] = useState<string | null>(null);

  const score = useMemo(
    () => computeTaxSafetyScoreFromMock(business, transactions, year),
    [business, transactions, year]
  );

  const { actions: apiActions, isLoading: apiLoading, isError } = useRecommendedActionsApi(
    business.id,
    year
  );

  const actions = useMemo(
    () =>
      apiActions && apiActions.length > 0
        ? apiActions
        : computeRecommendedActionsMock(business, transactions, score, currentPlanId),
    [apiActions, business, transactions, score, currentPlanId]
  );

  const handleClick = async (actionTarget: string, actionType?: string, available?: boolean) => {
    if (actionType === "GENERATE_YEAR_END_PACK" && available) {
      setPackError(null);
      try {
        await generate();
      } catch (e: any) {
        setPackError(e?.message || "Failed to generate pack");
      }
      return;
    }
    router.push(actionTarget);
  };

  return (
    <section className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Next best actions</h2>
        {/* Optional view all link could go here */}
      </div>
      {(apiLoading && !apiActions) ? (
        <p className="text-sm text-slate-500">Loading actions…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-slate-500">
          You’re in a strong place. Keep logging your activity each week.
        </p>
      ) : (
        <ul className="space-y-3">
          {actions.slice(0, 3).map((action) => (
            <li
              key={action.id}
              className={`flex items-start justify-between rounded-2xl px-4 py-3 ${
                action.visibility === "locked"
                  ? "border border-dashed border-slate-300 bg-slate-50"
                  : "border border-slate-200 bg-white"
              }`}
            >
              <div className="pr-4">
                <p className="text-sm font-medium text-slate-900">{action.label}</p>
                <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                {action.visibility === "locked" && action.requiredPlan && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                    Available on {action.requiredPlan[0].toUpperCase() +
                      action.requiredPlan.slice(1)} plan and above.
                  </p>
                )}
              </div>
              {action.visibility === "available" ? (
                <Button
                  size="sm"
                  className="rounded-full bg-emerald-600 text-xs font-semibold hover:bg-emerald-700"
                  onClick={() =>
                    handleClick(action.targetRoute, action.type, action.visibility === "available")
                  }
                  disabled={action.type === "GENERATE_YEAR_END_PACK" && packLoading}
                >
                  {action.type === "GENERATE_YEAR_END_PACK" && pack ? "Pack ready" : action.ctaLabel}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-emerald-600 text-emerald-700 text-xs font-semibold"
                  onClick={() => router.push("/app/pricing")}
                >
                  Upgrade
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {packError && <p className="text-xs font-semibold text-rose-600">{packError}</p>}
    </section>
  );
}


