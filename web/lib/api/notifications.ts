import { api } from "./client";

export interface NotificationPreference {
  id: string;
  businessId: string;
  userId: string;
  channel: "in_app" | "email" | "sms";
  enabled: boolean;
  rulesJson: {
    deadlineDays?: number[];
    dailyDigest?: boolean;
    quietHours?: {
      start: string;
      end: string;
      tz: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationEvent {
  id: string;
  businessId: string;
  userId: string | null;
  type: "deadline_reminder" | "task_overdue" | "accountant_request" | "filing_pack_ready";
  channel: "in_app" | "email" | "sms";
  status: "queued" | "sent" | "failed" | "skipped";
  provider: string | null;
  to: string | null;
  subject: string | null;
  bodyPreview: string | null;
  metaJson: any;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getNotificationPreferences(
  businessId: string
): Promise<NotificationPreference[]> {
  return api.get(`/businesses/${businessId}/notifications/preferences`);
}

export async function updateNotificationPreference(
  businessId: string,
  channel: "in_app" | "email" | "sms",
  enabled: boolean,
  rulesJson?: NotificationPreference["rulesJson"]
): Promise<NotificationPreference> {
  return api.post(`/businesses/${businessId}/notifications/preferences`, {
    channel,
    enabled,
    rulesJson,
  });
}

export async function getNotificationFeed(
  businessId: string,
  limit?: number
): Promise<NotificationEvent[]> {
  const query = limit ? `?limit=${limit}` : "";
  return api.get(`/businesses/${businessId}/notifications/feed${query}`);
}
