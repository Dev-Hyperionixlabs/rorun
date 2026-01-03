"use client";

import { api } from "./client";
import { YearSummary, FilingPack } from "../types";

export async function getYearSummary(
  businessId: string,
  year: number
): Promise<YearSummary> {
  const data = await api.get<any>(`/businesses/${businessId}/reports/${year}/summary`);

  // Backend returns a rich object:
  // { year, business, summary: { totalIncome, totalExpenses, estimatedProfit, ... }, ... }
  // Frontend expects YearSummary:
  // { year, totalIncome, totalExpenses, profit, byCategory, packs }
  if (data && typeof data === "object" && data.summary) {
    return {
      year: Number(data.year ?? year),
      totalIncome: Number(data.summary.totalIncome ?? 0),
      totalExpenses: Number(data.summary.totalExpenses ?? 0),
      profit: Number(data.summary.estimatedProfit ?? data.summary.profit ?? 0),
      byCategory: [],
      packs: [],
    } satisfies YearSummary;
  }

  // Back-compat: if API already matches expected shape, return as-is.
  return data as YearSummary;
}

export async function getFilingPacks(
  businessId: string,
  year?: number
): Promise<FilingPack[]> {
  const params = year ? `?year=${year}` : "";
  const response = await api.get<{ items: FilingPack[] }>(
    `/businesses/${businessId}/filing-packs${params}`
  );
  return response.items || [];
}

export async function generateFilingPack(
  businessId: string,
  year: number
): Promise<FilingPack> {
  return api.post(`/businesses/${businessId}/filing-packs`, { year });
}

export async function getLatestFilingPack(
  businessId: string,
  year: number
): Promise<FilingPack | null> {
  try {
    const response = await api.get<{ pack: FilingPack | null }>(
      `/businesses/${businessId}/filing-packs/latest?year=${year}`
    );
    return response.pack;
  } catch {
    return null;
  }
}
