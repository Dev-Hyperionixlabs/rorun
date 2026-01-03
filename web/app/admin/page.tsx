"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FileText, TrendingUp } from "lucide-react";
import { ErrorState } from "@/components/ui/page-state";
import { getAdminDashboardStats } from "@/lib/api/admin";
import Link from "next/link";

interface DashboardStats {
  totalUsers: number;
  totalBusinesses: number;
  transactionsYearToDate: number;
  planBreakdown: Record<string, number>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminDashboardStats();
        setStats(data);
      } catch (err: any) {
        setError(err?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Admin Dashboard</h1>
        <p className="text-sm text-slate-500">
          Overview of platform metrics and activity.
        </p>
      </div>

      {error && <ErrorState title="Couldn’t load admin dashboard" message={error} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users">
          <Card className="cursor-pointer transition hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.totalUsers ?? 0}
            </div>
          </CardContent>
          </Card>
        </Link>

        <Link href="/admin/workspaces">
          <Card className="cursor-pointer transition hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Total Workspaces
            </CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.totalBusinesses ?? 0}
            </div>
          </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Transactions (YTD)
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {Number(stats?.transactionsYearToDate ?? 0).toLocaleString() ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Paid Plans
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {stats?.planBreakdown
                ? Object.entries(stats.planBreakdown)
                    .filter(([k]) => k !== "free")
                    .reduce((sum, [, v]) => sum + v, 0)
                : 0}
            </div>
            <p className="text-xs text-slate-500">
              {stats?.planBreakdown?.free ?? 0} on Free plan
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Plan Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.planBreakdown &&
                Object.entries(stats.planBreakdown).map(([plan, count]) => {
                  const total = stats.totalBusinesses || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={plan} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-slate-700">{plan}</span>
                        <span className="text-slate-500">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/admin/workspaces"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              View all workspaces →
            </a>
            <a
              href="/admin/content"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Manage knowledge articles →
            </a>
            <a
              href="/admin/tax-config"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              Update tax rules →
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

