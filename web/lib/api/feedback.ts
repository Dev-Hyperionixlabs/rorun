"use client";

import { api } from "./client";

export async function submitFeedback(input: {
  category?: "bug" | "idea" | "question";
  message: string;
  userEmail?: string;
  pageUrl?: string;
  businessId?: string;
}) {
  return api.post<{ id: string; createdAt: string; status: string }>(`/feedback`, input);
}


