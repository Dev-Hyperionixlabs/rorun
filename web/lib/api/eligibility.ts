"use client";

import { api } from "./client";
import { EligibilityResult } from "../types";

export async function runEligibilityCheck(businessId: string): Promise<EligibilityResult> {
  // Backend route: POST /businesses/:id/eligibility/evaluate
  // (Older client used POST /businesses/:id/eligibility which does not exist.)
  return api.post(`/businesses/${businessId}/eligibility/evaluate`);
}

export async function getEligibilityResult(
  businessId: string,
  year?: number
): Promise<EligibilityResult | null> {
  try {
    const y = year ?? new Date().getFullYear();
    // Backend route: GET /businesses/:id/eligibility/:year
    return await api.get(`/businesses/${businessId}/eligibility/${y}`);
  } catch {
    return null;
  }
}

