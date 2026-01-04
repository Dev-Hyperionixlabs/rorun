"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/page-state";
import { Input } from "@/components/ui/input";
import { AdminFeedback, getAdminFeedback, updateAdminFeedback } from "@/lib/api/admin";

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"all" | "new" | "triaged" | "done">("new");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminFeedback | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await getAdminFeedback({ status: status === "all" ? undefined : status, limit: 100, offset: 0 });
      setItems(res.items || []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((f) => {
      const hay = `${f.category || ""} ${f.message} ${f.userEmail || ""} ${f.pageUrl || ""} ${f.businessId || ""} ${f.userId || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  useEffect(() => {
    if (!selected) return;
    setNotes(selected.adminNotes || "");
  }, [selected]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading feedback…</div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn’t load feedback" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Feedback</h1>
          <p className="text-sm text-slate-500">Review and resolve user feedback.</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Select
            value={status}
            onChange={(v) => setStatus(v as any)}
            options={[
              { value: "new", label: "New" },
              { value: "triaged", label: "Triaged" },
              { value: "done", label: "Done" },
              { value: "all", label: "All" },
            ]}
          />
          <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Submissions ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">No feedback found.</div>
            ) : (
              filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSelected(f)}
                  className={`w-full rounded-lg border px-3 py-3 text-left hover:bg-slate-50 ${
                    selected?.id === f.id ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {(f.userEmail || "Anonymous")} • {new Date(f.createdAt).toLocaleString()}
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        (f.status || "").toLowerCase() === "done"
                          ? "bg-emerald-50 text-emerald-700"
                          : (f.status || "").toLowerCase() === "triaged"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {(f.status || "new").toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    Category: <span className="font-semibold">{(f.category || "bug").toString()}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-700 line-clamp-2">{f.message}</div>
                  <div className="mt-2 text-[11px] text-slate-500 truncate">{f.pageUrl || "—"}</div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected ? (
              <div className="py-10 text-center text-sm text-slate-500">Select a submission.</div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">Message</div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>
                <div className="grid gap-2 text-xs text-slate-600">
                  <div><span className="text-slate-500">Email:</span> {selected.userEmail || "—"}</div>
                  <div><span className="text-slate-500">Category:</span> {selected.category || "—"}</div>
                  <div><span className="text-slate-500">Page:</span> {selected.pageUrl || "—"}</div>
                  <div><span className="text-slate-500">Business:</span> {selected.businessId || "—"}</div>
                  <div><span className="text-slate-500">User:</span> {selected.userId || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">Admin notes</div>
                  <textarea
                    className="w-full rounded-md border border-slate-200 bg-white p-2 text-sm"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const updated = await updateAdminFeedback(selected.id, {
                          adminNotes: notes.trim() || undefined,
                          status: "done",
                        });
                        setSelected(updated);
                        await load();
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Mark done
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const updated = await updateAdminFeedback(selected.id, {
                          adminNotes: notes.trim() || undefined,
                          status: "triaged",
                        });
                        setSelected(updated);
                        await load();
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Mark triaged
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      setSaving(true);
                      try {
                        const updated = await updateAdminFeedback(selected.id, {
                          adminNotes: notes.trim() || undefined,
                          status: "new",
                        });
                        setSelected(updated);
                        await load();
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                  >
                    Move back to new
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


