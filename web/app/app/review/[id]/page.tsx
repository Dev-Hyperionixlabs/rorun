"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { getBusinesses } from "@/lib/api/businesses";
import {
  bulkCategorize,
  bulkClassify,
  dismissReviewIssue,
  getReviewIssue,
  listTransactionCategories,
  overrideTransaction,
  ReviewIssue,
  TransactionCategory,
} from "@/lib/api/review";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";

export default function ReviewIssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;
  const { addToast } = useToast();

  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<ReviewIssue | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [categories, setCategories] = useState<TransactionCategory[]>([]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([_, v]) => v).map(([k]) => k),
    [selected]
  );

  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkClassification, setBulkClassification] = useState<"business" | "personal" | "unknown">("business");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const businesses = await getBusinesses();
      setBusinessId(businesses?.[0]?.id || null);
    })().catch(() => {});
  }, []);

  useEffect(() => {
    if (!businessId) return;
    load();
  }, [businessId, issueId]);

  const load = async () => {
    if (!businessId) return;
    try {
      setLoading(true);
      const data = await getReviewIssue(businessId, issueId);
      setIssue(data.issue);
      setTransactions(data.transactions || []);
      setTasks(data.tasks || []);

      // Load categories only if needed
      if (data.issue.type === "uncategorized") {
        const cats = await listTransactionCategories(businessId);
        setCategories(cats);
      }
    } catch (e: any) {
      addToast({
        title: "Failed to load issue",
        description: e?.message || "Please try again.",
        variant: "error",
      });
      router.push("/app/review");
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    transactions.forEach((t) => (next[t.id] = v));
    setSelected(next);
  };

  const handleBulkClassify = async () => {
    if (!businessId || selectedIds.length === 0) return;
    try {
      setSaving(true);
      await bulkClassify(businessId, selectedIds, bulkClassification);
      addToast({ title: "Updated classification", variant: "success" });
      await load();
    } catch (e: any) {
      addToast({ title: "Failed to update", description: e?.message || "", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCategorize = async () => {
    if (!businessId || selectedIds.length === 0) return;
    try {
      setSaving(true);
      await bulkCategorize(businessId, selectedIds, bulkCategoryId || null);
      addToast({ title: "Updated categories", variant: "success" });
      await load();
    } catch (e: any) {
      addToast({ title: "Failed to update", description: e?.message || "", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDismiss = async () => {
    if (!businessId || !issue) return;
    try {
      await dismissReviewIssue(businessId, issue.id);
      addToast({ title: "Issue dismissed", variant: "success" });
      router.push("/app/review");
    } catch (e: any) {
      addToast({ title: "Failed to dismiss", description: e?.message || "", variant: "error" });
    }
  };

  if (loading || !issue) {
    return (
      <div className="space-y-4">
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
      <div className="flex items-center justify-between">
        <Link href="/app/review">
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            Back
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-xs">
          Dismiss
        </Button>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">{issue.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">{issue.description}</p>
          {issue.metaJson?.count !== undefined && (
            <p className="text-xs text-slate-500 mt-2">
              {issue.metaJson.count} item{issue.metaJson.count !== 1 ? "s" : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {issue.type === "missing_month" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Missing months</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-slate-700 list-disc list-inside">
              {(issue.metaJson?.missingMonths || []).map((m: string) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
            <Link href="/app/transactions?import=true">
              <Button variant="secondary">Import statement</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {issue.type === "missing_evidence" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Tasks missing evidence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500">No tasks loaded.</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      Due {new Date(t.dueDate).toLocaleDateString("en-NG")}
                    </p>
                  </div>
                  <Link href={`/app/tasks/${t.id}`}>
                    <Button variant="secondary" size="sm" className="text-xs">
                      Attach evidence
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {(issue.type === "uncategorized" || issue.type === "unknown_classification" || issue.type === "possible_duplicate") && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={transactions.length > 0 && selectedIds.length === transactions.length}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
                Select all
              </label>
              <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            </div>

            {(issue as any).type !== "missing_month" && (
              <div className="grid gap-2 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-700">Bulk classify</p>
                  <Select
                    value={bulkClassification}
                    onChange={(v) => setBulkClassification(v as any)}
                    options={[
                      { value: "business", label: "Business" },
                      { value: "personal", label: "Personal" },
                      { value: "unknown", label: "Unknown" },
                    ]}
                  />
                  <Button variant="secondary" onClick={handleBulkClassify} disabled={saving || selectedIds.length === 0}>
                    {saving ? "Saving…" : "Apply"}
                  </Button>
                </div>

                {issue.type === "uncategorized" && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-700">Bulk categorize</p>
                    <Select
                      value={bulkCategoryId}
                      onChange={setBulkCategoryId}
                      options={[
                        { value: "", label: "No category" },
                        ...categories.map((c) => ({ value: c.id, label: `${c.name} (${c.type})` })),
                      ]}
                    />
                    <Button variant="secondary" onClick={handleBulkCategorize} disabled={saving || selectedIds.length === 0}>
                      {saving ? "Saving…" : "Apply"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {transactions.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                  No transactions loaded for this issue.
                </div>
              ) : (
                transactions.map((t) => (
                  <div key={t.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={!!selected[t.id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [t.id]: e.target.checked }))}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 line-clamp-1">
                            {t.description || "Transaction"}
                          </p>
                          <p className="text-sm font-semibold text-slate-900">
                            {(() => {
                              const n = Number((t as any).amount ?? 0);
                              return `₦${Number.isFinite(n) ? n.toLocaleString() : "—"}`;
                            })()}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(t.date).toLocaleDateString("en-NG")}
                        </p>

                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-xs text-slate-500">Classification</p>
                            <Select
                              value={t.classification || "unknown"}
                              onChange={async (v) => {
                                if (!businessId) return;
                                await overrideTransaction(businessId, t.id, { classification: v as any });
                                await load();
                              }}
                              options={[
                                { value: "business", label: "Business" },
                                { value: "personal", label: "Personal" },
                                { value: "unknown", label: "Unknown" },
                              ]}
                            />
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs text-slate-500">Category</p>
                            {issue.type === "uncategorized" ? (
                              <Select
                                value={t.categoryId || ""}
                                onChange={async (v) => {
                                  if (!businessId) return;
                                  await overrideTransaction(businessId, t.id, { categoryId: v || null });
                                  await load();
                                }}
                                options={[
                                  { value: "", label: "No category" },
                                  ...categories.map((c) => ({ value: c.id, label: `${c.name} (${c.type})` })),
                                ]}
                              />
                            ) : (
                              <Input value={t.category?.name || ""} placeholder="—" disabled />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {issue.type === "possible_duplicate" && issue.metaJson?.pairs?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Duplicate pairs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issue.metaJson.pairs.map((p: any, idx: number) => (
              <div key={idx} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-slate-600">
                    <p className="font-medium text-slate-900">Pair</p>
                    <p className="mt-1">A: {p.a}</p>
                    <p>B: {p.b}</p>
                    <p className="text-slate-500 mt-1">{p.reason}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      if (!businessId) return;
                      setSaving(true);
                      try {
                        await overrideTransaction(businessId, p.b, { classification: "personal", note: "Marked as possible duplicate" });
                        await load();
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="text-xs"
                  >
                    Mark B as duplicate (personal)
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
        <p>
          Changes are saved as overrides and will be used in reports and filing packs. Run a re-scan from the inbox if an issue doesn’t disappear immediately.
        </p>
      </div>
    </div>
  );
}


