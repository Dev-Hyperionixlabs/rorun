import { PlanId } from "../plans";
import { API_BASE, authHeaders } from "./client";

export async function getCurrentPlan(businessId: string): Promise<PlanId | null> {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/businesses/${businessId}/plan`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.planId as PlanId) ?? null;
}

export async function setCurrentPlanApi(businessId: string, planId: PlanId) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/businesses/${businessId}/plan`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ planId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to set plan (${res.status})`);
  }
  const data = await res.json();
  return data?.planId as PlanId;
}

