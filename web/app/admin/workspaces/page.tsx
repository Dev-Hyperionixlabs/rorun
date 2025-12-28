"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { ErrorState } from "@/components/ui/page-state";
import { getAdminWorkspaces } from "@/lib/api/admin";

interface Workspace {
  id: string;
  name: string;
  state: string;
  sector: string;
  planId: string;
  createdAt: string;
  taxYear: number;
  firsReadyScore: number;
  firsReadyBand: "low" | "medium" | "high";
  transactionsCountYearToDate: number;
}

export default function WorkspacesListPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        setError(null);
        const data = await getAdminWorkspaces(search);
        setWorkspaces((data.items || []) as any);
      } catch (err: any) {
        setError(err?.message || "Failed to load workspaces.");
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, [search]);

  const bandColor = (band: string) => {
    if (band === "high") return "bg-emerald-100 text-emerald-700";
    if (band === "medium") return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Workspaces</h1>
          <p className="text-sm text-slate-500">
            Manage all business workspaces on the platform.
          </p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search by name or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-sm text-slate-500">Loading workspaces...</div>
        </div>
      ) : error ? (
        <ErrorState title="Couldn’t load workspaces" message={error} onRetry={() => window.location.reload()} />
      ) : workspaces.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">No workspaces found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <Link key={ws.id} href={`/admin/workspaces/${ws.id}`}>
              <Card className="cursor-pointer transition hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {ws.name}
                      </h3>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
                          ws.planId === "free"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-50 text-emerald-700"
                        )}
                      >
                        {ws.planId}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-slate-500">
                      <span>{ws.state}</span>
                      <span>{ws.sector}</span>
                      <span>{ws.transactionsCountYearToDate} transactions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                          bandColor(ws.firsReadyBand)
                        )}
                      >
                        {ws.firsReadyScore}%
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        FIRS-Ready
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

