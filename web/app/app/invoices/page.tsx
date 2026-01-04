"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { invoicesApi, Invoice, InvoiceStatus } from "@/lib/api/invoices";
import { Loader2 } from "lucide-react";

type TabId = "outstanding" | "paid" | "draft";

function formatMoney(amount: number | null | undefined, currency = "NGN") {
  const n = Number(amount ?? 0);
  const prefix = currency === "NGN" ? "₦" : `${currency} `;
  return `${prefix}${Number.isFinite(n) ? n.toLocaleString() : "—"}`;
}

function isOutstanding(inv: Invoice) {
  return inv.status === "sent" || inv.status === "cancelled" ? false : inv.status !== "paid" && inv.status !== "draft";
}

export default function InvoicesPage() {
  const { businesses, currentBusinessId } = useMockApi();
  const businessId = currentBusinessId || businesses[0]?.id || null;
  const { addToast } = useToast();

  const [tab, setTab] = useState<TabId>("outstanding");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Invoice[]>([]);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await invoicesApi.listInvoices(businessId);
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      addToast({
        title: "Couldn’t load invoices",
        description: e?.message || "Please try again.",
        variant: "error",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = items;

    if (tab === "draft") list = list.filter((i) => i.status === "draft");
    if (tab === "paid") list = list.filter((i) => i.status === "paid");
    if (tab === "outstanding") list = list.filter((i) => i.status !== "paid" && i.status !== "draft");

    if (statusFilter !== "all") list = list.filter((i) => i.status === statusFilter);

    if (term) {
      list = list.filter((i) => {
        const hay = [
          i.invoiceNumber,
          i.client?.name,
          i.job?.title,
          i.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      });
    }

    // newest first
    return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [items, q, statusFilter, tab]);

  if (!businessId) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6 text-sm text-slate-600">No workspace selected.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500">Create simple invoices and track what’s outstanding.</p>
        </div>
        <Link href="/app/invoices/new">
          <Button className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700">
            Create invoice
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-auto">
        {([
          { id: "outstanding", label: "Outstanding" },
          { id: "paid", label: "Paid" },
          { id: "draft", label: "Draft" },
        ] as const).map((t) => (
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

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Search & filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search invoice number or client…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as any)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "draft", label: "Draft" },
              { value: "sent", label: "Sent" },
              { value: "paid", label: "Paid" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
          <Button variant="secondary" onClick={() => load()} loading={loading} className="rounded-full">
            Refresh
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="bg-white">
          <CardContent className="py-6 flex items-center justify-center text-slate-500 text-sm">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-8 text-center">
            <p className="text-sm font-semibold text-slate-900">No invoices yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Create your first invoice in under a minute.
            </p>
            <div className="mt-4">
              <Link href="/app/invoices/new">
                <Button className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700">
                  Create invoice
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const due = inv.dueDate ? new Date(inv.dueDate) : null;
            const status =
              inv.status === "paid"
                ? { bg: "bg-emerald-100", text: "text-emerald-700" }
                : inv.status === "draft"
                ? { bg: "bg-slate-100", text: "text-slate-700" }
                : { bg: "bg-amber-100", text: "text-amber-700" };

            return (
              <Link key={inv.id} href={`/app/invoices/${inv.id}`}>
                <Card className="bg-white hover:bg-slate-50 transition">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                            {inv.status}
                          </span>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {inv.invoiceNumber || "Invoice"}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 truncate">
                          {(inv.client?.name || "No client")}{inv.job?.title ? ` • ${inv.job.title}` : ""}
                        </p>
                        {due && (
                          <p className="mt-1 text-xs text-slate-500">
                            Due {due.toLocaleDateString("en-NG")}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {formatMoney(inv.totalAmount, inv.currency)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Issued {new Date(inv.issueDate).toLocaleDateString("en-NG")}
                        </p>
                      </div>
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


