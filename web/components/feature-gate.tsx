"use client";

import { ReactNode } from "react";
import { useFeatures } from "@/hooks/use-features";
import { minimumPlanForFeature, PlanFeatureKey } from "@/lib/plans";
import { useMockApi } from "@/lib/mock-api";
import { LockedFeature } from "./LockedFeature";

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
  const { hasFeature, loading, error } = useFeatures(businessId);
  useMockApi(); // preserve existing app-state side effects/assumptions
  const requiredPlan = minimumPlanForFeature(feature);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (!hasFeature(feature)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgrade) {
      return (
        <LockedFeature
          requiredPlan={requiredPlan}
          details={
            error
              ? `We couldn't verify your plan entitlements (${error}). Please retry, or upgrade if needed.`
              : undefined
          }
        />
      );
    }

    return null;
  }

  return <>{children}</>;
}

