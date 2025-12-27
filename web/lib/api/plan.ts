import { PlanId } from "../plans";
import { api } from "./client";

export async function getCurrentPlan(businessId: string): Promise<PlanId | null> {
  try {
    const data = await api.get<{ planId: string }>(`/businesses/${businessId}/plan`);
    return (data?.planId as PlanId) ?? null;
  } catch {
    return null;
  }
}

export async function setCurrentPlanApi(businessId: string, planId: PlanId): Promise<PlanId> {
  const data = await api.post<{ planId: string }>(`/businesses/${businessId}/plan`, { planId });
  return data.planId as PlanId;
}

export async function getEffectivePlan(businessId: string) {
  return api.get<{
    planId: string;
    features: Array<{ featureKey: string; limitValue?: number | null }>;
  }>(`/plans/effective?businessId=${businessId}`);
}

