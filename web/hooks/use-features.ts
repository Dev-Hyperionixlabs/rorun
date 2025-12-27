"use client";

import { useState, useEffect } from "react";
import { PlanFeatureKey } from "@/lib/plans";
import { api } from "@/lib/api/client";

interface EffectivePlan {
  planId: string;
  features: Array<{ featureKey: string; limitValue?: number | null }>;
}

export function useFeatures(businessId: string | null) {
  const [effectivePlan, setEffectivePlan] = useState<EffectivePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const data = await api.get<EffectivePlan>(`/plans/effective?businessId=${businessId}`);
        setEffectivePlan(data);
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load plan features");
        // Default to free plan on error
        setEffectivePlan({
          planId: "free",
          features: [],
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [businessId]);

  const hasFeature = (featureKey: PlanFeatureKey): boolean => {
    if (!effectivePlan) return false;
    return effectivePlan.features.some((f) => f.featureKey === featureKey);
  };

  return {
    planId: effectivePlan?.planId || "free",
    hasFeature,
    loading,
    error,
    refresh: async () => {
      if (!businessId) return;
      try {
        const data = await api.get<EffectivePlan>(`/plans/effective?businessId=${businessId}`);
        setEffectivePlan(data);
      } catch (e: any) {
        setError(e?.message || "Failed to refresh plan features");
      }
    },
  };
}

