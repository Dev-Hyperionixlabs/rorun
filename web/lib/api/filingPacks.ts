import { FilingPack } from "../types";
import { getStoredAuthToken } from "../auth-token";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

function authHeaders() {
  const bearer = API_TOKEN || getStoredAuthToken();
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
}

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

