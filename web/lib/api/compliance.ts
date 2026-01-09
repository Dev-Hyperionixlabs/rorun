"use client";

import { api } from "./client";

export interface ComplianceTask {
  id: string;
  businessId: string;
  taxYear: number;
  taskKey: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  dueDate: string;
  status: "open" | "in_progress" | "done" | "overdue" | "dismissed";
  priority: number;
  evidenceRequired: boolean;
  evidenceSpecJson?: {
    requiredTypes?: string[];
    coverageTarget?: number;
  };
  sourceRuleSet: string;
  createdBy: string;
  completedAt?: string;
  dismissedAt?: string;
  createdAt: string;
  updatedAt: string;
  evidenceLinks?: TaskEvidenceLink[];
  allowedActions?: Array<"start" | "complete" | "dismiss" | "add_evidence">;
}

export interface TaskEvidenceLink {
  id: string;
  taskId: string;
  documentId: string;
  note?: string;
  createdAt: string;
  document?: {
    id: string;
    type: string;
    storageUrl: string;
    mimeType?: string;
    size?: number;
    createdAt: string;
  };
}

export interface TaskQueryParams {
  taxYear?: number;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function getTasks(
  businessId: string,
  params?: TaskQueryParams
): Promise<ComplianceTask[]> {
  const query = new URLSearchParams();
  if (params?.taxYear) query.append("taxYear", params.taxYear.toString());
  if (params?.status) query.append("status", params.status);
  if (params?.from) query.append("from", params.from);
  if (params?.to) query.append("to", params.to);
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.offset) query.append("offset", params.offset.toString());

  const queryString = query.toString();
  return api.get(
    `/businesses/${businessId}/compliance/tasks${queryString ? `?${queryString}` : ""}`
  );
}

export async function getTask(
  businessId: string,
  taskId: string
): Promise<ComplianceTask> {
  return api.get(`/businesses/${businessId}/compliance/tasks/${taskId}`);
}

export async function startTask(
  businessId: string,
  taskId: string
): Promise<ComplianceTask> {
  return api.post(`/businesses/${businessId}/compliance/tasks/${taskId}/start`, {});
}

export async function completeTask(
  businessId: string,
  taskId: string
): Promise<ComplianceTask> {
  return api.post(`/businesses/${businessId}/compliance/tasks/${taskId}/complete`, {});
}

export async function dismissTask(
  businessId: string,
  taskId: string
): Promise<ComplianceTask> {
  return api.post(`/businesses/${businessId}/compliance/tasks/${taskId}/dismiss`, {});
}

export async function addEvidence(
  businessId: string,
  taskId: string,
  documentId: string,
  note?: string
): Promise<TaskEvidenceLink> {
  return api.post(`/businesses/${businessId}/compliance/tasks/${taskId}/evidence`, {
    documentId,
    note,
  });
}

export async function removeEvidence(
  businessId: string,
  taskId: string,
  linkId: string
): Promise<{ success: boolean }> {
  return api.delete(
    `/businesses/${businessId}/compliance/tasks/${taskId}/evidence/${linkId}`
  );
}

export async function regenerateTasks(
  businessId: string,
  taxYear?: number
): Promise<{ tasksGenerated: number; taxYear: number }> {
  const query = taxYear ? `?taxYear=${taxYear}` : "";
  return api.post(`/businesses/${businessId}/compliance/regenerate${query}`, {});
}

