import { api } from "./client";

export interface BillingStatus {
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  plan: {
    id: string;
    name: string;
    planKey: string | null;
    monthlyPrice: number;
    currency: string;
  };
  features: Array<{
    featureKey: string;
    limitValue: number | null;
  }>;
}

export async function getBillingStatus(businessId: string): Promise<BillingStatus> {
  return api.get<BillingStatus>(`/businesses/${businessId}/billing/status`);
}

export async function createCheckoutSession(
  businessId: string,
  planKey: string
): Promise<{ authorizationUrl: string }> {
  return api.post<{ authorizationUrl: string }>(
    `/businesses/${businessId}/billing/checkout`,
    { planKey }
  );
}

