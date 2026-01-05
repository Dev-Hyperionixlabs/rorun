"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/page-state";
import { getBusinesses } from "@/lib/api/businesses";
import { getObligations, generateObligations, Obligation } from "@/lib/api/obligations";
import { getTaxEvaluation } from "@/lib/api/taxRules";

function statusBadge(status: Obligation["status"]) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize";
  if (status === "overdue") return `${base} bg-rose-100 text-rose-700`;
  if (status === "due") return `${base} bg-amber-100 text-amber-800`;
  if (status === "fulfilled") return `${base} bg-emerald-100 text-emerald-700`;
  return `${base} bg-slate-100 text-slate-600`;
}

type DeadlineItem = {
  key: string;
  templateKey?: string;
  title: string;
  description?: string;
  frequency: string;
  dueDate?: string | Date;
  computedDueDateForYear?: string | Date;
  periodStart?: string | Date;
  periodEnd?: string | Date;
};

function deadlineStatus(dueDate: Date): "overdue" | "due_soon" | "upcoming" {
  const now = new Date();
  if (dueDate.getTime() < now.getTime()) return "overdue";
  const in30 = new Date(now);
  in30.setDate(in30.getDate() + 30);
  if (dueDate.getTime() <= in30.getTime()) return "due_soon";
  return "upcoming";
}

function deadlineBadge(status: "overdue" | "due_soon" | "upcoming") {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium";
  if (status === "overdue") return `${base} bg-rose-100 text-rose-700`;
  if (status === "due_soon") return `${base} bg-amber-100 text-amber-800`;
  return `${base} bg-slate-100 text-slate-600`;
}

export default function ObligationsPage() {
  const sp = useSearchParams();
  const filter = (sp.get("filter") || "all").toLowerCase();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [items, setItems] = useState<Obligation[]>([]);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadBusiness = async () => {
    const businesses = await getBusinesses();
    if (businesses && businesses.length > 0) setBusinessId(businesses[0].id);
  };

  const load = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [obs, evalRes] = await Promise.all([
        getObligations(id).catch(() => []),
        getTaxEvaluation(id, new Date().getFullYear()).catch(() => null),
      ]);
      setItems(obs || []);
      setEvaluation(evalRes);
      const dl = (evalRes?.evaluation?.outputs?.deadlines || []) as DeadlineItem[];
      setDeadlines(Array.isArray(dl) ? dl : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load obligations.");
      setItems([]);
      setEvaluation(null);
      setDeadlines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness().catch(() => {});
  }, []);

  useEffect(() => {
    if (businessId) load(businessId).catch(() => {});
  }, [businessId]);

  const visible = useMemo(() => {
    if (filter === "overdue") return items.filter((o) => o.status === "overdue");
    if (filter === "due") return items.filter((o) => o.status === "due");
    if (filter === "upcoming") return items.filter((o) => o.status === "upcoming");
    return items;
  }, [items, filter]);

  const nextDue = useMemo(() => {
    const upcoming = items
      .filter((o) => o.status !== "fulfilled")
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return upcoming[0] || null;
  }, [items]);

  const visibleDeadlines = useMemo(() => {
    const list = (deadlines || [])
      .map((d) => {
        const raw = (d.computedDueDateForYear || d.dueDate) as any;
        if (!raw) return null;
        const due = new Date(raw);
        if (Number.isNaN(due.getTime())) return null;
        return { ...d, due };
      })
      .filter(Boolean) as Array<DeadlineItem & { due: Date }>;

    list.sort((a, b) => a.due.getTime() - b.due.getTime());

    if (filter === "overdue") return list.filter((d) => deadlineStatus(d.due) === "overdue");
    if (filter === "due") return list.filter((d) => deadlineStatus(d.due) === "due_soon");
    if (filter === "upcoming") return list.filter((d) => deadlineStatus(d.due) === "upcoming");
    return list;
  }, [deadlines, filter]);

  const handleRecalculate = async () => {
    if (!businessId) return;
    setRefreshing(true);
    try {
      // This generates obligations from the active rule-set deadlines (2026-ready).
      await generateObligations(businessId, new Date().getFullYear());
      await load(businessId);
    } catch (e: any) {
      setError(e?.message || "Failed to refresh obligations.");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading obligations…</div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn’t load obligations" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Obligations</h1>
          <p className="text-sm text-slate-500">
            What applies to your business, why it applies, and what’s due next.
          </p>
          {evaluation?.ruleSet?.version && (
            <p className="mt-1 text-xs text-slate-500">
              Rule set: <span className="font-medium">{evaluation.ruleSet.version}</span>
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          onClick={handleRecalculate}
          disabled={refreshing}
          className="rounded-full"
        >
          {refreshing ? "Refreshing…" : "Recalculate"}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Next due</CardTitle>
          </CardHeader>
          <CardContent>
            {nextDue ? (
              <div className="text-sm text-slate-900">
                <div className="font-semibold">{nextDue.taxType}</div>
                <div className="text-xs text-slate-500">{new Date(nextDue.dueDate).toDateString()}</div>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No upcoming obligations</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {items.filter((o) => o.status === "overdue").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{items.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Your obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visible.length === 0 && visibleDeadlines.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold text-slate-900">No configured tax deadlines yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Once an admin activates a rule set with deadline templates, your obligations will appear here.
              </p>
            </div>
          ) : null}

          {visible.length === 0 && visibleDeadlines.length > 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Deadlines from your active rule set</p>
              <p className="mt-1 text-xs text-slate-500">
                These are computed from the tax rules engine. Click “Recalculate” to generate obligations from them.
              </p>
            </div>
          ) : null}

          {visible.length > 0 ? (
            visible.map((o) => (
              <div
                key={o.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900">{o.taxType}</div>
                    <span className={statusBadge(o.status)}>{o.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Period: {new Date(o.periodStart).toLocaleDateString()} →{" "}
                    {new Date(o.periodEnd).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-slate-500">Due: {new Date(o.dueDate).toDateString()}</div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {evaluation?.evaluation?.explanations?.[`${o.taxType.toLowerCase()}Status`] || ""}
                </div>
              </div>
            ))
          ) : null}

          {visible.length === 0 && visibleDeadlines.length > 0 ? (
            visibleDeadlines.map((d: any) => {
              const st = deadlineStatus(d.due);
              return (
                <div
                  key={d.key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">{d.title || d.key}</div>
                      <span className={deadlineBadge(st)}>{st === "due_soon" ? "due soon" : st}</span>
                    </div>
                    {d.description ? <div className="mt-1 text-xs text-slate-500">{d.description}</div> : null}
                    <div className="text-xs text-slate-500">Due: {d.due.toDateString()}</div>
                  </div>
                  <div className="text-right text-xs text-slate-500">{d.templateKey ? `template: ${d.templateKey}` : ""}</div>
                </div>
              );
            })
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}


