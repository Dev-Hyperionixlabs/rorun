"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTransaction } from "@/lib/api/transactions";
import { useToast } from "@/components/ui/toast";

export default function NewTransactionPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <NewTransactionInner />
    </Suspense>
  );
}

function NewTransactionInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { addToast } = useToast();
  const { businesses, currentBusinessId } = useMockApi();
  const businessId = currentBusinessId || businesses[0]?.id || null;

  const type = (search.get("type") as "income" | "expense" | null) || "income";
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const isValidAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [amount]);

  if (!businessId) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-semibold text-rose-900">No workspace found</p>
        <p className="mt-1 text-sm text-rose-700">Please set up a workspace first.</p>
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => router.push("/onboarding")}>
            Set up workspace
          </Button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!isValidAmount) return;
    setSaving(true);
    try {
      await createTransaction({
        businessId,
        type,
        amount: Number(amount),
        description: description || undefined,
        date,
      });
      addToast({
        title: type === "income" ? "Income added" : "Expense added",
        description: "Saved successfully.",
      });
      router.push("/app/transactions");
    } catch (e: any) {
      addToast({
        title: "Couldn’t save transaction",
        description: e?.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Add {type === "income" ? "income" : "expense"}
        </h1>
        <p className="text-sm text-slate-500">Log a simple record to keep your month complete.</p>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-900">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Amount (₦)</label>
            <Input
              inputMode="decimal"
              placeholder="e.g. 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-800">Description (optional)</label>
            <Input
              placeholder={type === "income" ? "e.g. Client payment" : "e.g. Fuel"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
              onClick={handleSave}
              disabled={saving || !isValidAmount}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={() => router.push("/app/transactions")}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


