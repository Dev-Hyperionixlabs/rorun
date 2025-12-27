"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTasks, ComplianceTask } from "@/lib/api/compliance";
import { getBusinesses } from "@/lib/api/businesses";
import { useToast } from "@/components/ui/toast";
import { Loader2, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import Link from "next/link";

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <TasksPageInner />
    </Suspense>
  );
}

function TasksPageInner() {
  const searchParams = useSearchParams();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());
  const { addToast } = useToast();

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    if (businessId) {
      loadTasks();
    }
  }, [businessId, activeTab, taxYear]);

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

  const loadTasks = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      const params: any = { taxYear };
      if (activeTab !== "all") {
        params.status = activeTab;
      }
      const data = await getTasks(businessId, params);
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

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      overdue: {
        bg: "bg-red-100",
        text: "text-red-700",
        icon: AlertCircle,
        label: "Overdue",
      },
      open: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: Clock,
        label: "Open",
      },
      in_progress: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: Clock,
        label: "In Progress",
      },
      done: {
        bg: "bg-emerald-100",
        text: "text-emerald-700",
        icon: CheckCircle2,
        label: "Done",
      },
      dismissed: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        icon: XCircle,
        label: "Dismissed",
      },
    };
    return badges[status] || badges.open;
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "open", label: "Open" },
    { id: "overdue", label: "Overdue" },
    { id: "done", label: "Done" },
  ];

  if (!businessId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-slate-500">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Compliance Tasks</h1>
          <p className="text-sm text-slate-500">
            Track your tax compliance tasks and deadlines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-slate-500">
              No tasks found. Tasks are generated automatically based on your business profile.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const badge = getStatusBadge(task.status);
            const Icon = badge.icon;

            return (
              <Card key={task.id} className="bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.bg} ${badge.text}`}
                        >
                          <Icon className="h-3 w-3" />
                          {badge.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          {task.category} • {task.frequency}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-1">
                        {task.title}
                      </h3>
                      <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Due: {formatDueDate(task.dueDate)}</span>
                        {task.evidenceRequired && (
                          <span className="text-amber-600">Evidence required</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Link href={`/app/tasks/${task.id}`}>
                        <Button size="sm" variant="secondary" className="text-xs">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

