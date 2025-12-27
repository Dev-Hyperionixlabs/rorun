"use client";

import { ReactNode } from "react";
import { useFeatures } from "@/hooks/use-features";
import { PlanFeatureKey } from "@/lib/plans";
import { useMockApi } from "@/lib/mock-api";
import { Button } from "./ui/button";

interface FeatureGateProps {
  feature: PlanFeatureKey;
  businessId: string | null;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  feature,
  businessId,
  children,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const { hasFeature, loading } = useFeatures(businessId);
  const { currentPlanId } = useMockApi();

  if (loading) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (!hasFeature(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgrade) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900 mb-2">Feature locked</p>
          <p className="text-amber-700 mb-3">
            This feature requires a {currentPlanId === "free" ? "Basic" : "higher"} plan.
          </p>
          <Button
            size="sm"
            onClick={() => {
              window.location.href = "/app/settings?tab=plan";
            }}
          >
            Upgrade plan
          </Button>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

