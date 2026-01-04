import { api } from "./client";

export interface TaxRuleSet {
  id: string;
  version: string;
  name: string;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ObligationSnapshot {
  outputs: {
    citStatus?: string;
    vatStatus?: string;
    whtStatus?: string;
    complianceNote?: string;
    deadlines?: Array<{
      key: string;
      title: string;
      frequency: string;
      dueDate?: string;
      computedDueDateForYear?: string;
      periodStart?: string;
      periodEnd?: string;
    }>;
    thresholds?: {
      turnoverThreshold?: number;
      nearingThreshold?: boolean;
    };
  };
  explanations: Record<string, string>;
  evaluatedAt: string;
  ruleSetVersion: string;
}

export async function getActiveRuleSet(businessId: string): Promise<TaxRuleSet | null> {
  return api.get(`/businesses/${businessId}/tax/active-ruleset`);
}

export async function evaluateBusiness(
  businessId: string,
  taxYear?: number
): Promise<{ snapshot: any; evaluation: any }> {
  const query = taxYear ? `?taxYear=${taxYear}` : "";
  return api.post(`/businesses/${businessId}/tax/evaluate${query}`, {});
}

export async function getTaxEvaluation(
  businessId: string,
  taxYear?: number,
): Promise<{ ruleSet: any; taxYear: number; profile: any; evaluation: any }> {
  const query = taxYear ? `?taxYear=${taxYear}` : "";
  return api.get(`/businesses/${businessId}/tax/evaluation${query}`);
}

export async function getLatestSnapshot(businessId: string): Promise<ObligationSnapshot> {
  return api.get(`/businesses/${businessId}/tax/snapshot/latest`);
}

