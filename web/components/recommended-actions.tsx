"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { useMockApi } from "@/lib/mock-api";
import { computeTaxSafetyScoreFromMock } from "@/lib/tax-safety";
import { computeRecommendedActionsMock } from "@/lib/recommended-actions";
import { useRecommendedActionsApi } from "@/hooks/use-recommended-actions";
import { useFilingPack } from "@/hooks/use-filing-pack";
import { completeAction, dismissAction } from "@/lib/api/recommended-actions";
import { Check, X } from "lucide-react";

export function RecommendedActionsSection() {
  const router = useRouter();
  const { businesses, transactions, currentPlanId } = useMockApi();
  const business = businesses[0];
  const year = new Date().getFullYear();
  const { pack, generate, isLoading: packLoading } = useFilingPack(business.id, year);
  const [packError, setPackError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const score = useMemo(
    () => computeTaxSafetyScoreFromMock(business, transactions, year),
    [business, transactions, year]
  );

  const { actions: apiActions, isLoading: apiLoading, isError, refresh: refreshActions } = useRecommendedActionsApi(
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
        // Mark as completed after successful generation
        if (actionType) {
          await handleComplete(actionType);
        }
      } catch (e: any) {
        setPackError(e?.message || "Failed to generate pack");
      }
      return;
    }
    
    // Handle guided flows
    if (actionType === "RUN_ELIGIBILITY_CHECK") {
      router.push("/onboarding");
      return;
    }
    if (actionType === "ADD_RECORDS_FOR_MISSING_MONTHS") {
      router.push("/app/transactions?focus=missing-months");
      return;
    }
    if (actionType === "UPLOAD_RECEIPTS_FOR_HIGH_VALUE") {
      router.push("/app/documents?filter=missing-receipts");
      return;
    }
    
    router.push(actionTarget);
  };

  const handleComplete = async (actionType: string) => {
    setCompleting(actionType);
    try {
      await completeAction(business.id, actionType, year);
      // Refresh actions to remove completed one
      if (refreshActions) await refreshActions();
    } catch (e) {
      console.error("Failed to complete action", e);
    } finally {
      setCompleting(null);
    }
  };

  const handleDismiss = async (actionType: string) => {
    setCompleting(actionType);
    try {
      await dismissAction(business.id, actionType, year);
      if (refreshActions) await refreshActions();
    } catch (e) {
      console.error("Failed to dismiss action", e);
    } finally {
      setCompleting(null);
    }
  };

  return (
    <section data-section="recommended-actions" className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Do these 3 things next</h2>
      </div>
      {(apiLoading && !apiActions) ? (
        <p className="text-sm text-slate-500">Loading actions…</p>
      ) : actions.length === 0 ? (
        <p className="text-sm text-slate-500">
          You&apos;re in a strong place. Keep logging your activity each week.
        </p>
      ) : (
        <ul className="space-y-3">
          {actions.slice(0, 3).map((action) => (
            <li
              key={action.id}
              className={`flex items-start justify-between rounded-xl px-4 py-3 ${
                action.visibility === "locked"
                  ? "border border-dashed border-slate-300 bg-slate-50"
                  : "border border-slate-200 bg-white"
              }`}
            >
              <div className="pr-4 flex-1">
                <p className="text-sm font-medium text-slate-900">{action.label}</p>
                <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                {action.visibility === "locked" && action.requiredPlan && (
                  <p className="mt-1 text-[11px] font-medium text-amber-700">
                    Available on {action.requiredPlan[0].toUpperCase() +
                      action.requiredPlan.slice(1)} plan and above.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {action.visibility === "available" && (
                  <>
                    <button
                      onClick={() => handleDismiss(action.type)}
                      disabled={completing === action.type}
                      className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      title="Dismiss"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <Button
                      size="sm"
                      className="rounded-full bg-emerald-600 text-xs font-semibold hover:bg-emerald-700"
                      onClick={() =>
                        handleClick(action.targetRoute, action.type, action.visibility === "available")
                      }
                      disabled={action.type === "GENERATE_YEAR_END_PACK" && packLoading || completing === action.type}
                    >
                      {completing === action.type ? "..." : action.type === "GENERATE_YEAR_END_PACK" && pack ? "Pack ready" : action.ctaLabel}
                    </Button>
                  </>
                )}
                {action.visibility === "locked" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full border-emerald-600 text-emerald-700 text-xs font-semibold"
                    onClick={() => router.push("/app/settings?tab=plan")}
                  >
                    Upgrade
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {packError && <p className="text-xs font-semibold text-rose-600">{packError}</p>}
    </section>
  );
}


