"use client";

import { api } from "./client";

export interface TaxSafetyScore {
  businessId: string;
  taxYear: number;
  score: number;
  band: "low" | "medium" | "high";
  reasons: string[];
  breakdown: {
    hasCurrentTaxProfile: boolean;
    recordsCoverageRatio: number;
    receiptCoverageRatio: number;
    hasOverdueObligation: boolean;
    daysUntilNextDeadline: number | null;
  };
}

export interface FirsReadyStatus {
  businessId: string;
  taxYear: number;
  score: number;
  band: "low" | "medium" | "high";
  label: string;
  message: string;
}

export async function getTaxSafetyScore(
  businessId: string,
  year?: number
): Promise<TaxSafetyScore> {
  const params = year ? `?year=${year}` : "";
  return api.get(`/businesses/${businessId}/tax-safety${params}`);
}

export async function getFirsReadyStatus(
  businessId: string,
  year?: number
): Promise<FirsReadyStatus> {
  const params = year ? `?year=${year}` : "";
  return api.get(`/businesses/${businessId}/tax-safety/firs-ready${params}`);
}

