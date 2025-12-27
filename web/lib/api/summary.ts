"use client";

import { api } from "./client";
import { YearSummary, FilingPack } from "../types";

export async function getYearSummary(
  businessId: string,
  year: number
): Promise<YearSummary> {
  return api.get(`/businesses/${businessId}/reports/${year}/summary`);
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
