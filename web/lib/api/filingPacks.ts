import { FilingPack } from "../types";
import { API_BASE, authHeaders } from "./client";

export async function getLatestFilingPack(businessId: string, year: number) {
  if (!API_BASE) return null;
  const res = await fetch(
    `${API_BASE}/businesses/${businessId}/filing-packs/latest?year=${year}`,
    {
      credentials: "include",
      headers: authHeaders(),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.pack as FilingPack | null;
}

export async function createFilingPack(businessId: string, year: number) {
  if (!API_BASE) throw new Error("API not configured");
  const res = await fetch(`${API_BASE}/businesses/${businessId}/filing-packs?year=${year}`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create filing pack (${res.status})`);
  }
  const data = await res.json();
  return data?.pack as FilingPack;
}

