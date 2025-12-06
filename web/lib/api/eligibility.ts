"use client";

import { api } from "./client";
import { EligibilityResult } from "../types";

export async function runEligibilityCheck(businessId: string): Promise<EligibilityResult> {
  return api.post(`/businesses/${businessId}/eligibility`);
}

export async function getEligibilityResult(
  businessId: string,
  year?: number
): Promise<EligibilityResult | null> {
  try {
    const params = year ? `?year=${year}` : "";
    return await api.get(`/businesses/${businessId}/eligibility${params}`);
  } catch {
    return null;
  }
}

