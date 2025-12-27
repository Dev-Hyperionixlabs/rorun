"use client";

import { api } from "./client";
import { Business } from "../types";

export interface CreateBusinessInput {
  name: string;
  legalForm: string;
  sector?: string;
  state?: string;
  cacNumber?: string;
  tin?: string;
  vatRegistered?: boolean;
  estimatedTurnoverBand?: string;
}

export async function getBusinesses(): Promise<Business[]> {
  // Backend returns an array; older clients expected `{ items }`.
  const response = await api.get<any>("/businesses");
  if (Array.isArray(response)) return response as Business[];
  return (response?.items as Business[]) || [];
}

export async function getBusiness(id: string): Promise<Business> {
  return api.get(`/businesses/${id}`);
}

export async function createBusiness(data: CreateBusinessInput): Promise<Business> {
  return api.post("/businesses", data);
}

export async function updateBusiness(
  id: string,
  data: Partial<CreateBusinessInput>
): Promise<Business> {
  return api.patch(`/businesses/${id}`, data);
}

export async function deleteBusiness(id: string): Promise<void> {
  return api.delete(`/businesses/${id}`);
}

// Plan management
export async function getBusinessPlan(businessId: string) {
  return api.get<{ planId: string }>(`/businesses/${businessId}/plan`);
}

export async function updateBusinessPlan(businessId: string, planId: string) {
  return api.post(`/businesses/${businessId}/plan`, { planId });
}

// Notification settings
export async function getNotificationSettings(businessId: string) {
  return api.get(`/businesses/${businessId}/notification-settings`);
}

export async function updateNotificationSettings(
  businessId: string,
  settings: {
    deadlineDueSoon?: boolean;
    deadlineVerySoon?: boolean;
    monthlyReminder?: boolean;
    missingReceipts?: boolean;
  }
) {
  return api.put(`/businesses/${businessId}/notification-settings`, settings);
}

