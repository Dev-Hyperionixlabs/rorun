"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/page-state";
import { Input } from "@/components/ui/input";
import { getAdminBankConnectAttempts, AdminBankConnectAttempt } from "@/lib/api/admin";

export default function BankConnectErrorsPage() {
  const [items, setItems] = useState<AdminBankConnectAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await getAdminBankConnectAttempts({ success: false, limit: 200, offset: 0 });
      setItems(res.items || []);
    } catch (e: any) {
      setItems([]);
      setError(e?.message || "Failed to load connect attempts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((a) => {
      const hay = `${a.reason || ""} ${a.countryCode || ""} ${a.businessId || ""} ${a.userId || ""} ${a.provider || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading bank connect errors…</div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Couldn’t load bank connect errors" message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Bank connect errors</h1>
          <p className="text-sm text-slate-500">Failed connect attempts (for support triage).</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search reason/country/business/user…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Attempts ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No failures recorded.</div>
          ) : (
            filtered.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-900">
                    {new Date(a.createdAt).toLocaleString()} • {a.provider.toUpperCase()}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {a.countryCode || "—"}
                  </div>
                </div>
                <div className="mt-1 text-sm text-slate-800">
                  {a.reason || "Unknown failure"}
                </div>
                <div className="mt-2 grid gap-1 text-[11px] text-slate-500">
                  <div>businessId: {a.businessId || "—"}</div>
                  <div>userId: {a.userId || "—"}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


