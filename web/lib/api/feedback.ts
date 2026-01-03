"use client";

import { api } from "./client";

export async function submitFeedback(input: {
  message: string;
  email?: string;
  pageUrl?: string;
  businessId?: string;
}) {
  return api.post<{ id: string; createdAt: string; status: string }>(`/feedback`, input);
}


