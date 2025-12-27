"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTasks, ComplianceTask, startTask, completeTask } from "@/lib/api/compliance";
import { useToast } from "@/components/ui/toast";
import { Calendar, CheckCircle2, AlertCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";

interface ComplianceTasksCardProps {
  businessId: string;
}

export function ComplianceTasksCard({ businessId }: ComplianceTasksCardProps) {
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    loadTasks();
  }, [businessId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getTasks(businessId, {
        status: "open,overdue,in_progress",
        limit: 3,
      });
      setTasks(data);
    } catch (error: any) {
      addToast({
        title: "Failed to load tasks",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (task: ComplianceTask, action: "start" | "complete") => {
    try {
      setActionLoading(task.id);
      if (action === "start") {
        await startTask(businessId, task.id);
      } else {
        await completeTask(businessId, task.id);
      }
      addToast({
        title: action === "start" ? "Task started" : "Task completed",
        variant: "success",
      });
      await loadTasks();
    } catch (error: any) {
      addToast({
        title: "Action failed",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any }> = {
      overdue: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: AlertCircle,
      },
      open: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: Clock,
      },
      in_progress: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: Clock,
      },
      done: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        icon: CheckCircle2,
      },
    };
    return badges[status] || badges.open;
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return "Due today";
    } else if (diffDays === 1) {
      return "Due tomorrow";
    } else if (diffDays <= 7) {
      return `Due in ${diffDays} days`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const getNextDeadline = () => {
    if (tasks.length === 0) return null;
    const sorted = [...tasks].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    return sorted[0];
  };

  const nextDeadline = getNextDeadline();

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Next actions
          </CardTitle>
          <Link href="/app/tasks">
            <Button variant="ghost" size="sm" className="text-xs">
              View all
            </Button>
          </Link>
        </div>
        {nextDeadline && (
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
            <Calendar className="h-3 w-3" />
            <span>
              Next deadline: {formatDueDate(nextDeadline.dueDate)} • {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-500">
            <p>No pending tasks. Great job!</p>
            <p className="mt-1 text-[11px]">
              Tasks are generated automatically based on your business profile.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const badge = getStatusBadge(task.status);
            const Icon = badge.icon;

            return (
              <div
                key={task.id}
                className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}
                    >
                      <Icon className="h-3 w-3" />
                      {task.status}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-medium text-slate-900">
                    {task.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {task.description}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {formatDueDate(task.dueDate)}
                  </p>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  {task.status === "open" || task.status === "overdue" ? (
                    <Button
                      size="sm"
                      variant={task.status === "overdue" ? "danger" : "primary"}
                      onClick={() => handleAction(task, "start")}
                      disabled={actionLoading === task.id}
                      className="text-xs whitespace-nowrap"
                    >
                      {actionLoading === task.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : task.status === "overdue" ? (
                        "Fix"
                      ) : (
                        "Do now"
                      )}
                    </Button>
                  ) : task.status === "in_progress" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleAction(task, "complete")}
                      disabled={actionLoading === task.id}
                      className="text-xs whitespace-nowrap"
                    >
                      {actionLoading === task.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  ) : null}
                  <Link href={`/app/tasks/${task.id}`}>
                    <Button size="sm" variant="ghost" className="text-xs">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

