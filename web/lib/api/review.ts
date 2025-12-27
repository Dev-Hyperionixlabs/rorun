"use client";

import { api } from "./client";

export type ReviewIssueType =
  | "uncategorized"
  | "unknown_classification"
  | "missing_month"
  | "missing_evidence"
  | "possible_duplicate";

export interface ReviewIssue {
  id: string;
  businessId: string;
  taxYear: number;
  type: ReviewIssueType;
  severity: "low" | "medium" | "high";
  status: "open" | "dismissed" | "resolved";
  title: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  metaJson?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: string;
}

export async function getReviewIssues(
  businessId: string,
  params: { taxYear: number; status?: string; type?: string }
): Promise<ReviewIssue[]> {
  const sp = new URLSearchParams();
  sp.set("taxYear", String(params.taxYear));
  if (params.status) sp.set("status", params.status);
  if (params.type) sp.set("type", params.type);
  return api.get(`/businesses/${businessId}/review/issues?${sp.toString()}`);
}

export async function getReviewIssue(
  businessId: string,
  id: string
): Promise<{ issue: ReviewIssue; transactions?: any[]; tasks?: any[] }> {
  return api.get(`/businesses/${businessId}/review/issues/${id}`);
}

export async function dismissReviewIssue(businessId: string, id: string) {
  return api.post(`/businesses/${businessId}/review/issues/${id}/dismiss`, {});
}

export async function rescanReviewIssues(businessId: string, taxYear: number) {
  return api.post(`/businesses/${businessId}/review/rescan?taxYear=${taxYear}`, {});
}

export async function bulkClassify(
  businessId: string,
  transactionIds: string[],
  classification: "business" | "personal" | "unknown"
) {
  return api.post(`/businesses/${businessId}/review/transactions/bulk-classify`, {
    transactionIds,
    classification,
  });
}

export async function bulkCategorize(
  businessId: string,
  transactionIds: string[],
  categoryId: string | null
) {
  return api.post(`/businesses/${businessId}/review/transactions/bulk-categorize`, {
    transactionIds,
    categoryId,
  });
}

export async function overrideTransaction(
  businessId: string,
  transactionId: string,
  patch: { classification?: "business" | "personal" | "unknown"; categoryId?: string | null; note?: string }
) {
  return api.post(`/businesses/${businessId}/review/transactions/${transactionId}/override`, patch);
}

export async function listTransactionCategories(businessId: string): Promise<TransactionCategory[]> {
  return api.get(`/businesses/${businessId}/transactions/categories`);
}


