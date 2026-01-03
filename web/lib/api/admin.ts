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

export type AdminUser = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export async function getAdminUsers() {
  return adminFetch<AdminUser[]>(`/admin/users`);
}

export async function getAdminUser(id: string) {
  return adminFetch<{
    user: AdminUser;
    businesses: Array<{ id: string; name: string }>;
    memberOf: Array<{ businessId: string; name: string; role: string }>;
  }>(`/admin/users/${id}`);
}

// --- Tax Rules (Rule Sets v2) ---

export type AdminTaxRuleSet = {
  id: string;
  version: string;
  name: string;
  status: "draft" | "active" | "archived";
  effectiveFrom: string;
  effectiveTo: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { rules: number; deadlineTemplates: number };
};

export type AdminTaxRuleV2 = {
  id: string;
  ruleSetId: string;
  key: string;
  type: "eligibility" | "obligation" | "deadline" | "threshold";
  priority: number;
  conditionsJson: any;
  outcomeJson: any;
  explanation: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminDeadlineTemplate = {
  id: string;
  ruleSetId: string;
  key: string;
  frequency: "monthly" | "quarterly" | "annual" | "one_time";
  dueDayOfMonth: number | null;
  dueMonth: number | null;
  dueDay: number | null;
  offsetDays: number | null;
  appliesWhenJson: any | null;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export async function getAdminTaxRuleSets() {
  return adminFetch<AdminTaxRuleSet[]>(`/admin/tax-rules/rule-sets`);
}

export async function getAdminTaxRuleSet(id: string) {
  return adminFetch<AdminTaxRuleSet & { rules: AdminTaxRuleV2[]; deadlineTemplates: AdminDeadlineTemplate[] }>(
    `/admin/tax-rules/rule-sets/${id}`,
  );
}

export async function createAdminTaxRuleSet(input: {
  version: string;
  name: string;
  effectiveFrom: string; // ISO
  effectiveTo?: string;
  description?: string;
}) {
  return adminFetch<AdminTaxRuleSet>(`/admin/tax-rules/rule-sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function updateAdminTaxRuleSet(
  id: string,
  input: { name?: string; status?: "draft" | "active" | "archived"; effectiveTo?: string; description?: string },
) {
  return adminFetch<AdminTaxRuleSet>(`/admin/tax-rules/rule-sets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function createAdminTaxRule(ruleSetId: string, input: {
  key: string;
  type: "eligibility" | "obligation" | "deadline" | "threshold";
  priority: number;
  conditionsJson: any;
  outcomeJson: any;
  explanation: string;
}) {
  return adminFetch<AdminTaxRuleV2>(`/admin/tax-rules/rule-sets/${ruleSetId}/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function createAdminDeadlineTemplate(ruleSetId: string, input: {
  key: string;
  frequency: "monthly" | "quarterly" | "annual" | "one_time";
  dueDayOfMonth?: number;
  dueMonth?: number;
  dueDay?: number;
  offsetDays?: number;
  appliesWhenJson?: any;
  title: string;
  description: string;
}) {
  return adminFetch<AdminDeadlineTemplate>(`/admin/tax-rules/rule-sets/${ruleSetId}/deadline-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function testAdminTaxEvaluation(ruleSetId: string, input: { businessProfile: any; taxYear?: number }) {
  return adminFetch<any>(`/admin/tax-rules/rule-sets/${ruleSetId}/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}


