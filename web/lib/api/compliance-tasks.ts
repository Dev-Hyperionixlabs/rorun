import { api } from "./client";

export interface ComplianceTask {
  id: string;
  businessId: string;
  taxYear: number;
  taskType: string;
  title: string;
  description: string | null;
  dueDate: string;
  status: "open" | "in_progress" | "done" | "overdue" | "dismissed";
  priority: number;
  evidenceLinks?: Array<{
    id: string;
    document: {
      id: string;
      type: string;
      storageUrl: string;
      createdAt: string;
    };
  }>;
}

export interface TaskQuery {
  taxYear?: number;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get compliance tasks for a business
 */
export async function getComplianceTasks(
  businessId: string,
  query: TaskQuery = {}
): Promise<ComplianceTask[]> {
  const params = new URLSearchParams();
  if (query.taxYear) params.set("taxYear", String(query.taxYear));
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));

  const qs = params.toString();
  return api.get<ComplianceTask[]>(
    `/businesses/${businessId}/compliance/tasks${qs ? `?${qs}` : ""}`
  );
}

/**
 * Get a single compliance task
 */
export async function getComplianceTask(
  businessId: string,
  taskId: string
): Promise<ComplianceTask> {
  return api.get<ComplianceTask>(
    `/businesses/${businessId}/compliance/tasks/${taskId}`
  );
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  businessId: string,
  taskId: string,
  status: ComplianceTask["status"]
): Promise<ComplianceTask> {
  if (status === "in_progress") {
    return api.post<ComplianceTask>(`/businesses/${businessId}/compliance/tasks/${taskId}/start`, {});
  }
  if (status === "done") {
    return api.post<ComplianceTask>(`/businesses/${businessId}/compliance/tasks/${taskId}/complete`, {});
  }
  if (status === "dismissed") {
    return api.post<ComplianceTask>(`/businesses/${businessId}/compliance/tasks/${taskId}/dismiss`, {});
  }
  // For statuses without explicit transitions, keep it a no-op fetch
  return getComplianceTask(businessId, taskId);
}

/**
 * Get upcoming deadlines (next 30 days) for a business
 */
export async function getUpcomingDeadlines(
  businessId: string,
  days = 30
): Promise<ComplianceTask[]> {
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  
  return getComplianceTasks(businessId, {
    from: now.toISOString().split("T")[0],
    to: future.toISOString().split("T")[0],
    status: "open",
    limit: 5,
  });
}

/**
 * Get the next deadline task
 */
export async function getNextDeadline(
  businessId: string
): Promise<ComplianceTask | null> {
  try {
    const tasks = await getUpcomingDeadlines(businessId, 90);
    return tasks.length > 0 ? tasks[0] : null;
  } catch {
    return null;
  }
}

