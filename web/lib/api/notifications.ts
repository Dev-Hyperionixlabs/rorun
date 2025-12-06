import { API_BASE, authHeaders } from "./client";

export async function getNotificationSettingsApi(businessId: string) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/businesses/${businessId}/notification-settings`, {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function updateNotificationSettingsApi(
  businessId: string,
  data: {
    deadlineDueSoon: boolean;
    deadlineVerySoon: boolean;
    monthlyReminder: boolean;
    missingReceipts: boolean;
  }
) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/businesses/${businessId}/notification-settings`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update notification settings (${res.status})`);
  }
  return res.json();
}

