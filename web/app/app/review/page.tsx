"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getBusinesses } from "@/lib/api/businesses";
import { getReviewIssues, getReviewIssueCounts, rescanReviewIssues, ReviewIssue, ReviewIssueType, ReviewIssueCounts } from "@/lib/api/review";
import { Loader2, AlertTriangle, RefreshCw, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";
import { ErrorState, useSlowLoading } from "@/components/ui/page-state";
import { useMockApi as useMockData } from "@/lib/mock-api";

const TABS: Array<{ id: "all" | ReviewIssueType | "high"; label: string }> = [
  { id: "all", label: "All" },
  { id: "high", label: "High priority" },
  { id: "uncategorized", label: "Uncategorized" },
  { id: "unknown_classification", label: "Unknown business/personal" },
  { id: "missing_evidence", label: "Missing evidence" },
  { id: "possible_duplicate", label: "Duplicates" },
  { id: "missing_month", label: "Missing months" },
];

export default function ReviewPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [issues, setIssues] = useState<ReviewIssue[]>([]);
  const [counts, setCounts] = useState<ReviewIssueCounts>({ open: 0, dismissed: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "dismissed" | "resolved" | "all">("open");
  const [rescanning, setRescanning] = useState(false);
  const { addToast } = useToast();
  const taxYear = new Date().getFullYear();
  const slow = useSlowLoading(loading);
  const { businesses: mockBusinesses } = useMockData();

  useEffect(() => {
    (async () => {
      try {
        if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true" && mockBusinesses?.[0]?.id) {
          setBusinessId(mockBusinesses[0].id);
          setBusinessError(null);
          return;
        }

        setBusinessError(null);
        const businesses = await getBusinesses();
        const id = businesses?.[0]?.id || null;
        setBusinessId(id);
        if (!id) {
          setBusinessError("No workspace found for this account.");
          setLoading(false);
        }
      } catch (e: any) {
        setBusinessId(null);
        setBusinessError(e?.message || "Couldn't load your workspace.");
        setLoading(false);
      }
    })().catch(() => {});
  }, []);

  useEffect(() => {
    if (!businessId) return;
    load();
  }, [businessId, tab, statusFilter]);

  const load = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      setLoadError(null);
      
      // Load issues with status filter
      const statusParam = statusFilter === "all" ? undefined : statusFilter;
      const data = await getReviewIssues(businessId, { taxYear, status: statusParam });
      setIssues(data);
      
      // Load counts
      const c = await getReviewIssueCounts(businessId, taxYear);
      setCounts(c);
    } catch (e: any) {
      setLoadError(e?.message || "Please try again later.");
      addToast({
        title: "Failed to load issues",
        description: e?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (tab === "all") return issues;
    if (tab === "high") return issues.filter((i) => i.severity === "high");
    return issues.filter((i) => i.type === tab);
  }, [issues, tab]);

  const badge = (severity: ReviewIssue["severity"]) => {
    const map = {
      high: { bg: "bg-rose-100", text: "text-rose-700", label: "High" },
      medium: { bg: "bg-amber-100", text: "text-amber-700", label: "Medium" },
      low: { bg: "bg-slate-100", text: "text-slate-700", label: "Low" },
    } as const;
    return map[severity];
  };

  const handleRescan = async () => {
    if (!businessId) return;
    try {
      setRescanning(true);
      await rescanReviewIssues(businessId, taxYear);
      await load();
      addToast({ title: "Rescan complete", variant: "success" });
    } catch (e: any) {
      addToast({
        title: "Rescan failed",
        description: e?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setRescanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Review issues</h1>
          <p className="text-sm text-slate-500">
            Fix data issues that reduce filing readiness.
          </p>
        </div>
        <Button variant="secondary" onClick={handleRescan} disabled={rescanning || !businessId}>
          {rescanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Rescanning…
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-scan
            </>
          )}
        </Button>
      </div>

      {/* Status Counts */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setStatusFilter("open")}
          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
            statusFilter === "open" ? "border-amber-500 bg-amber-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <Clock className="h-5 w-5 text-amber-600" />
          <div className="text-left">
            <div className="text-lg font-bold text-slate-900">{counts.open}</div>
            <div className="text-xs text-slate-500">Open</div>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter("resolved")}
          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
            statusFilter === "resolved" ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div className="text-left">
            <div className="text-lg font-bold text-slate-900">{counts.resolved}</div>
            <div className="text-xs text-slate-500">Resolved</div>
          </div>
        </button>
        <button
          onClick={() => setStatusFilter("dismissed")}
          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
            statusFilter === "dismissed" ? "border-slate-500 bg-slate-50" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <XCircle className="h-5 w-5 text-slate-500" />
          <div className="text-left">
            <div className="text-lg font-bold text-slate-900">{counts.dismissed}</div>
            <div className="text-xs text-slate-500">Ignored</div>
          </div>
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {businessError && (
        <ErrorState
          title="Couldn’t load workspace"
          message={businessError}
          onRetry={() => window.location.reload()}
        />
      )}

      {businessError ? null : loadError ? (
        <ErrorState title="Couldn’t load issues" message={loadError} onRetry={() => load()} />
      ) : loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                {slow && (
                  <button
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    onClick={() => load()}
                  >
                    Still loading… Retry
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-700 font-medium">No open issues</p>
            <p className="text-xs text-slate-500 mt-1">
              You’re good to go for now. If you add new data, run a re-scan.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => {
            const b = badge(i.severity);
            const count = i.metaJson?.count;
            return (
              <Link key={i.id} href={`/app/review/${i.id}`}>
                <Card className="bg-white hover:bg-slate-50 transition">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${b.bg} ${b.text}`}>
                            {b.label}
                          </span>
                          {typeof count === "number" && (
                            <span className="text-xs text-slate-500">{count} item{count !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{i.title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{i.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


