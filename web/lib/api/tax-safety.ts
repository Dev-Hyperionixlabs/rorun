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
    receiptCoverageRatio: number | null;
    hasOverdueObligation: boolean;
    daysUntilNextDeadline: number | null;
    hasFilingPackForYear?: boolean;
  };
  breakdownPoints?: {
    taxProfile: { earned: number; max: number };
    recordsCoverage: { earned: number; max: number };
    receipts: { earned: number; max: number };
    deadlines: { earned: number; max: number };
    overdue: { earned: number; max: number };
    filingPack: { earned: number; max: number };
  };
  deductions?: Array<{ code: string; points: number; reason: string; howToFix: string; href?: string }>;
  nextActions?: Array<{ title: string; href?: string }>;
  scoreBreakdownV2?: {
    totalScore: number;
    totalMax: 100;
    components: Array<{
      key: string;
      label: string;
      points: number;
      maxPoints: number;
      description?: string;
      howToImprove?: string;
      href?: string;
    }>;
    flags?: Array<{
      key: string;
      label: string;
      severity: "info" | "warn" | "critical";
      deltaPoints?: number;
    }>;
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

