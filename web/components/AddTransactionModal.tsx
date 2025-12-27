"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";

type TxType = "income" | "expense";

type TxCategory = { id: string; name: string; type: string };

export function AddTransactionModal({
  open,
  onClose,
  businessId,
  type,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  type: TxType;
  onCreated?: () => void;
}) {
  const { addToast } = useToast();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const [categories, setCategories] = useState<TxCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  const isValidAmount = useMemo(() => {
    const n = Number(amount);
    return Number.isFinite(n) && n > 0;
  }, [amount]);

  useEffect(() => {
    if (!open) return;
    // Load categories on open (best-effort; optional)
    let cancelled = false;
    (async () => {
      setLoadingCats(true);
      try {
        const data = await api.get<TxCategory[]>(
          `/businesses/${businessId}/transactions/categories`
        );
        if (!cancelled) setCategories(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoadingCats(false);
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, businessId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSave = async () => {
    if (!isValidAmount) return;
    setSaving(true);
    try {
      const finalDescription =
        paymentMethod.trim().length > 0
          ? `${description || ""}${description ? " " : ""}(Payment: ${paymentMethod.trim()})`
          : description || undefined;

      await api.post(`/businesses/${businessId}/transactions`, {
        type,
        amount: Number(amount),
        date,
        description: finalDescription,
        categoryId: categoryId || undefined,
        source: "manual",
      });

      addToast({
        title: type === "income" ? "Income added" : "Expense added",
        description: "Saved successfully.",
        variant: "success",
      });
      onClose();
      onCreated?.();
      // reset
      setAmount("");
      setDescription("");
      setPaymentMethod("");
      setCategoryId("");
    } catch (e: any) {
      addToast({
        title: "Couldn’t save transaction",
        description: e?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const categoryOptions = [
    { value: "", label: loadingCats ? "Loading categories…" : "No category" },
    ...categories
      .filter((c) => c.type === type || !c.type)
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center p-3">
        <Card className="w-full md:max-w-md bg-white rounded-2xl shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Add {type === "income" ? "income" : "expense"}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                <X className="h-4 w-4" />
              </Button>
            </div>
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
              <label className="text-sm font-medium text-slate-800">Description</label>
              <Input
                placeholder={type === "income" ? "e.g. Client payment" : "e.g. Fuel"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">Category (optional)</label>
              <Select value={categoryId} onChange={setCategoryId} options={categoryOptions} />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-800">Payment method (optional)</label>
              <Input
                placeholder="e.g. Transfer, Cash, POS"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                onClick={handleSave}
                disabled={saving || !isValidAmount}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button variant="secondary" className="rounded-full" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


