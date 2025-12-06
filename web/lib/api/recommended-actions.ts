import { getStoredAuthToken } from "../auth-token";
import { RecommendedAction } from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

function getBearerToken(): string | null {
  if (API_TOKEN) return API_TOKEN;
  return getStoredAuthToken();
}

export async function fetchRecommendedActions(
  businessId: string,
  year: number
): Promise<RecommendedAction[] | null> {
  if (!API_BASE) {
    return null;
  }

  const url = `${API_BASE}/businesses/${businessId}/recommended-actions?year=${year}`;
  const headers: Record<string, string> = {};
  const bearer = getBearerToken();
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const res = await fetch(url, {
    credentials: "include",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch recommended actions (${res.status})`);
  }

  const data = await res.json();
  return data?.items ?? [];
}

