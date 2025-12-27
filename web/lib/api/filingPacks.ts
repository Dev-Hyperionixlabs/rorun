import { api, API_BASE } from "./client";

export interface FilingPack {
  id: string;
  businessId: string;
  taxYear: number;
  status: "queued" | "generating" | "ready" | "failed";
  version: number;
  requestedByUserId: string;
  requestedAt: string;
  completedAt?: string;
  errorMessage?: string;
  pdfUrl?: string | null;
  csvUrl?: string | null;
  zipUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FilingPackHistory {
  packs: FilingPack[];
}

export async function getFilingPackStatus(
  businessId: string,
  taxYear?: number
): Promise<{ pack: FilingPack | null }> {
  const query = taxYear ? `?taxYear=${taxYear}` : "";
  return api.get(`/businesses/${businessId}/filing-pack/status${query}`);
}

export async function getFilingPackHistory(
  businessId: string,
  taxYear?: number
): Promise<FilingPackHistory> {
  const query = taxYear ? `?taxYear=${taxYear}` : "";
  return api.get(`/businesses/${businessId}/filing-pack/history${query}`);
}

export async function generateFilingPack(
  businessId: string,
  taxYear: number
): Promise<{ packId: string; status: string }> {
  return api.post(`/businesses/${businessId}/filing-pack/generate`, { taxYear });
}

export async function regenerateFilingPack(
  businessId: string,
  packId: string
): Promise<{ packId: string; status: string }> {
  return api.post(`/businesses/${businessId}/filing-pack/${packId}/regenerate`, {});
}

export function getFilingPackDownloadUrl(
  businessId: string,
  packId: string,
  type: "pdf" | "csv" | "zip"
): string {
  return `${API_BASE}/businesses/${businessId}/filing-pack/${packId}/download/${type}`;
}

// Backwards-compatible aliases (used by mock flows)
export async function getLatestFilingPack(
  businessId: string,
  taxYear?: number
): Promise<FilingPack | null> {
  const { pack } = await getFilingPackStatus(businessId, taxYear);
  return pack ?? null;
}

export async function createFilingPack(
  businessId: string,
  taxYear: number
): Promise<{ packId: string; status: string }> {
  return generateFilingPack(businessId, taxYear);
}

