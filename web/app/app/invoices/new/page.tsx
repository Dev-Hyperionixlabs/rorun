"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  invoicesApi,
  Client,
  CreateInvoiceItemInput,
  Job,
} from "@/lib/api/invoices";
import { Plus, Trash2 } from "lucide-react";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <NewInvoiceInner />
    </Suspense>
  );
}

function NewInvoiceInner() {
  const router = useRouter();
  const { addToast } = useToast();
  const { businesses, currentBusinessId } = useMockApi();
  const businessId = currentBusinessId || businesses[0]?.id || null;

  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  const [clientId, setClientId] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState<string>("");
  const [currency] = useState("NGN");
  const [notes, setNotes] = useState("");

  const [newClientName, setNewClientName] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  const [items, setItems] = useState<CreateInvoiceItemInput[]>([
    { description: "Service fee", quantity: 1, unitPrice: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  }, [items]);

  const isValid = useMemo(() => {
    const hasClient = !!clientId;
    const hasLine = items.some((i) => i.description.trim() && Number(i.quantity) > 0 && Number(i.unitPrice) >= 0);
    return hasClient && hasLine;
  }, [clientId, items]);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [c, j] = await Promise.all([
        invoicesApi.listClients(businessId),
        invoicesApi.listJobs(businessId),
      ]);
      setClients(Array.isArray(c) ? c : []);
      setJobs(Array.isArray(j) ? j : []);
    } catch (e: any) {
      addToast({
        title: "Couldn’t load invoice data",
        description: e?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const filteredJobs = useMemo(() => {
    if (!clientId) return jobs;
    return jobs.filter((j) => (j.clientId || "") === clientId);
  }, [jobs, clientId]);

  const handleCreateClient = async () => {
    if (!businessId) return;
    const name = newClientName.trim();
    if (!name) return;
    setCreatingClient(true);
    try {
      const created = await invoicesApi.createClient(businessId, { name });
      setClients((prev) => [created, ...prev]);
      setClientId(created.id);
      setNewClientName("");
      addToast({ title: "Client added", variant: "success" });
    } catch (e: any) {
      addToast({ title: "Couldn’t add client", description: e?.message || "", variant: "error" });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSave = async () => {
    if (!businessId || !isValid) return;
    setSaving(true);
    try {
      const created = await invoicesApi.createInvoice(businessId, {
        clientId,
        jobId: jobId || null,
        issueDate,
        dueDate: dueDate || null,
        currency,
        notes: notes.trim() ? notes.trim() : null,
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description.trim(),
            quantity: Number(i.quantity) || 0,
            unitPrice: Number(i.unitPrice) || 0,
          })),
      });
      addToast({ title: "Invoice created", description: "Saved as draft.", variant: "success" });
      router.push(`/app/invoices/${created.id}`);
    } catch (e: any) {
      addToast({ title: "Couldn’t create invoice", description: e?.message || "Please try again.", variant: "error" });
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Create invoice</h1>
        <p className="text-sm text-slate-500">Mobile-first, minimal—get paid faster.</p>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Client</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={clientId}
            onChange={(v) => {
              setClientId(v);
              setJobId("");
            }}
            options={[
              { value: "", label: loading ? "Loading…" : "Select a client" },
              ...clients.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Quick add client</p>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Client name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleCreateClient}
                disabled={!newClientName.trim()}
                loading={creatingClient}
              >
                Add
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">Issue date</label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">Due date (optional)</label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Job (optional)</label>
            <Select
              value={jobId}
              onChange={(v) => setJobId(v)}
              options={[
                { value: "", label: "No job" },
                ...filteredJobs.map((j) => ({ value: j.id, label: j.title })),
              ]}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any extra context…" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Description</label>
                <Input
                  value={it.description}
                  onChange={(e) =>
                    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))
                  }
                  placeholder="e.g. Website design"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Qty</label>
                  <Input
                    inputMode="decimal"
                    value={String(it.quantity)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quantity: Number.isFinite(v) ? v : 0 } : p)));
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Unit price (₦)</label>
                  <Input
                    inputMode="decimal"
                    value={String(it.unitPrice)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, unitPrice: Number.isFinite(v) ? v : 0 } : p)));
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Line total:{" "}
                  <span className="font-semibold text-slate-900">
                    ₦{((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0)).toLocaleString()}
                  </span>
                </p>
                <button
                  className="text-xs font-semibold text-rose-700 hover:text-rose-800 inline-flex items-center gap-1"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}
            className="rounded-full"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add line item
          </Button>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Subtotal</p>
            <p className="text-sm font-semibold text-slate-900">₦{subtotal.toLocaleString()}</p>
          </div>

          <div className="flex gap-2">
            <Button
              className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
              onClick={handleSave}
              disabled={!isValid}
              loading={saving}
            >
              Save draft
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={() => router.push("/app/invoices")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


