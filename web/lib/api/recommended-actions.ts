import { RecommendedAction } from "../types";
import { API_BASE, authHeaders } from "./client";

export async function fetchRecommendedActions(
  businessId: string,
  year: number
): Promise<RecommendedAction[] | null> {
  if (!API_BASE) {
    return null;
  }

  const url = `${API_BASE}/businesses/${businessId}/recommended-actions?year=${year}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: authHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch recommended actions (${res.status})`);
  }

  const data = await res.json();
  return data?.items ?? [];
}

