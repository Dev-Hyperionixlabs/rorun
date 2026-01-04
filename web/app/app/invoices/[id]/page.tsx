"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { invoicesApi, Invoice, InvoiceStatus } from "@/lib/api/invoices";
import { ArrowLeft, Loader2 } from "lucide-react";

function formatMoney(amount: number | null | undefined, currency = "NGN") {
  const n = Number(amount ?? 0);
  const prefix = currency === "NGN" ? "₦" : `${currency} `;
  return `${prefix}${Number.isFinite(n) ? n.toLocaleString() : "—"}`;
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { businesses, currentBusinessId } = useMockApi();
  const businessId = currentBusinessId || businesses[0]?.id || null;
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const data = await invoicesApi.getInvoice(businessId, id);
      setInvoice(data);
      setNotes(data.notes || "");
      setStatus(data.status);
    } catch (e: any) {
      addToast({ title: "Couldn’t load invoice", description: e?.message || "", variant: "error" });
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, id]);

  const totals = useMemo(() => {
    const subtotal = Number(invoice?.subtotalAmount ?? 0);
    const total = Number(invoice?.totalAmount ?? subtotal);
    return { subtotal, total };
  }, [invoice]);

  const handleSave = async () => {
    if (!businessId || !invoice) return;
    setSaving(true);
    try {
      const updated = await invoicesApi.updateInvoice(businessId, invoice.id, {
        status,
        notes: notes.trim() ? notes.trim() : null,
      });
      setInvoice(updated);
      addToast({ title: "Saved", variant: "success" });
    } catch (e: any) {
      addToast({ title: "Couldn’t save", description: e?.message || "Please try again.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!businessId || !invoice) return;
    setSaving(true);
    try {
      const updated = await invoicesApi.markInvoicePaid(businessId, invoice.id);
      setInvoice(updated);
      setStatus(updated.status);
      addToast({ title: "Marked as paid", variant: "success" });
    } catch (e: any) {
      addToast({ title: "Couldn’t mark as paid", description: e?.message || "Please try again.", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!businessId) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6 text-sm text-slate-600">No workspace selected.</CardContent>
      </Card>
    );
  }

  if (loading || !invoice) {
    return (
      <Card className="bg-white">
        <CardContent className="py-6 flex items-center justify-center text-slate-500 text-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
        </CardContent>
      </Card>
    );
  }

  const badge =
    invoice.status === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : invoice.status === "draft"
      ? "bg-slate-100 text-slate-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/app/invoices">
          <Button variant="ghost" size="sm" className="text-xs">
            <ArrowLeft className="mr-1.5 h-3 w-3" />
            Back
          </Button>
        </Link>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badge}`}>{invoice.status}</span>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {invoice.invoiceNumber || "Invoice"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Client:</span> {invoice.client?.name || "—"}
          </p>
          {invoice.job?.title && (
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Job:</span> {invoice.job.title}
            </p>
          )}
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Issue date:</span>{" "}
            {new Date(invoice.issueDate).toLocaleDateString("en-NG")}
          </p>
          {invoice.dueDate && (
            <p className="text-sm text-slate-700">
              <span className="font-semibold">Due date:</span>{" "}
              {new Date(invoice.dueDate).toLocaleDateString("en-NG")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(invoice.items || []).length === 0 ? (
            <p className="text-sm text-slate-500">No line items found.</p>
          ) : (
            (invoice.items || []).map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{it.description}</p>
                  <p className="text-xs text-slate-500">
                    {it.quantity} × {formatMoney(it.unitPrice, invoice.currency)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{formatMoney(it.amount, invoice.currency)}</p>
              </div>
            ))
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-semibold text-slate-900">{formatMoney(totals.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total</span>
              <span className="font-semibold text-slate-900">{formatMoney(totals.total, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Status</label>
            <Select
              value={status}
              onChange={(v) => setStatus(v as InvoiceStatus)}
              options={[
                { value: "draft", label: "Draft" },
                { value: "sent", label: "Sent" },
                { value: "paid", label: "Paid" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Internal notes</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional…" />
          </div>

          <div className="flex gap-2">
            <Button
              className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
              onClick={handleSave}
              loading={saving}
            >
              Save
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={() => router.push("/app/invoices")}>
              Close
            </Button>
            {invoice.status !== "paid" && (
              <Button variant="secondary" className="rounded-full" onClick={handleMarkPaid} loading={saving}>
                Mark as paid
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


