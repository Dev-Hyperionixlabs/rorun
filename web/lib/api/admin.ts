"use client";

import { API_BASE, ApiError } from "./client";
import { getAdminKey } from "@/lib/admin-key";

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new ApiError(0, "API is not configured.", "API_NOT_CONFIGURED");
  const key = getAdminKey();
  if (!key) throw new ApiError(401, "Admin key missing.", "ADMIN_KEY_MISSING");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        "x-admin-key": key,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.status === 401) throw new ApiError(401, "Unauthorized.", "ADMIN_UNAUTHORIZED");
    if (!res.ok) {
      const text = await res.text();
      throw new ApiError(res.status, text || "Request failed.", "ADMIN_REQUEST_FAILED");
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new ApiError(0, "Request timed out.", "TIMEOUT");
    throw e;
  }
}

export async function verifyAdminKey(): Promise<void> {
  await adminFetch("/admin/dashboard-stats");
}

export async function getAdminDashboardStats() {
  return adminFetch<{
    totalUsers: number;
    totalBusinesses: number;
    transactionsYearToDate: number;
    planBreakdown: Record<string, number>;
  }>("/admin/dashboard-stats");
}

export async function getAdminWorkspaces(q?: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  const suffix = params.toString() ? `?${params}` : "";
  return adminFetch<{ items: any[] }>(`/admin/workspaces${suffix}`);
}

export async function getAdminWorkspace(id: string) {
  return adminFetch<any>(`/admin/workspaces/${id}`);
}

export async function setAdminWorkspacePlan(id: string, planId: string) {
  return adminFetch<any>(`/admin/workspaces/${id}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
}

export async function impersonateUser(userId: string) {
  return adminFetch<{ token: string }>(`/admin/impersonate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}


