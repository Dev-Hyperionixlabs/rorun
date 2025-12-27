"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getNotificationFeed, NotificationEvent } from "@/lib/api/notifications";
import { getBusinesses } from "@/lib/api/businesses";
import { useToast } from "@/components/ui/toast";
import { Loader2, Bell, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    if (businessId) {
      loadNotifications();
    }
  }, [businessId]);

  const loadBusiness = async () => {
    try {
      const businesses = await getBusinesses();
      if (businesses && businesses.length > 0) {
        setBusinessId(businesses[0].id);
      }
    } catch (error: any) {
      console.error("Failed to load business:", error);
    }
  };

  const loadNotifications = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const data = await getNotificationFeed(businessId, 50);
      setNotifications(data);
    } catch (error: any) {
      addToast({
        title: "Failed to load notifications",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: NotificationEvent["type"]) => {
    switch (type) {
      case "deadline_reminder":
        return Clock;
      case "task_overdue":
        return XCircle;
      case "filing_pack_ready":
        return FileText;
      default:
        return Bell;
    }
  };

  const getNotificationTitle = (notification: NotificationEvent) => {
    switch (notification.type) {
      case "deadline_reminder":
        return notification.bodyPreview || "Deadline reminder";
      case "task_overdue":
        return notification.bodyPreview || "Overdue tasks";
      case "filing_pack_ready":
        return notification.bodyPreview || "Filing pack ready";
      default:
        return notification.bodyPreview || "Notification";
    }
  };

  const getNotificationLink = (notification: NotificationEvent) => {
    if (notification.metaJson?.taskId) {
      return `/app/tasks/${notification.metaJson.taskId}`;
    }
    if (notification.metaJson?.packId) {
      return `/app/summary`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Your recent notifications and reminders.</p>
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
        <p className="text-sm text-slate-500">Your recent notifications and reminders.</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No notifications yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              You&apos;ll see reminders and updates here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const link = getNotificationLink(notification);
            const content = (
              <Card className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-slate-100 p-2">
                      <Icon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {getNotificationTitle(notification)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString("en-NG", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {notification.status === "sent" && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );

            return link ? (
              <Link key={notification.id} href={link}>
                {content}
              </Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

