"use client";

import { api } from "./client";
import { Alert } from "../types";

export async function getAlerts(businessId: string): Promise<Alert[]> {
  const response = await api.get<{ items: Alert[] }>(`/businesses/${businessId}/alerts`);
  return response.items || [];
}

export async function markAlertRead(businessId: string, alertId: string): Promise<void> {
  return api.patch(`/businesses/${businessId}/alerts/${alertId}`, { readAt: new Date().toISOString() });
}

export async function dismissAlert(businessId: string, alertId: string): Promise<void> {
  return api.delete(`/businesses/${businessId}/alerts/${alertId}`);
}

