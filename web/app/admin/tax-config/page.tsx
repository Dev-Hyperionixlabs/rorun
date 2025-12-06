"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Save, X } from "lucide-react";

interface TaxRule {
  id: string;
  taxType: string;
  year: number;
  thresholdLower: number;
  thresholdUpper: number | null;
  ratePercentage: number;
  description: string;
}

export default function TaxConfigPage() {
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<TaxRule>>({});
  const [creating, setCreating] = useState(false);

  const adminKey =
    typeof window !== "undefined"
      ? localStorage.getItem("rorun_admin_key") || ""
      : "";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch(`${apiUrl}/admin/tax-rules`, {
          headers: { "x-admin-key": adminKey },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setRules(data || []);
      } catch (err) {
        // Mock fallback
        setRules([
          {
            id: "rule-1",
            taxType: "CIT",
            year: 2025,
            thresholdLower: 0,
            thresholdUpper: 25000000,
            ratePercentage: 0,
            description: "Micro businesses exempt from CIT",
          },
          {
            id: "rule-2",
            taxType: "CIT",
            year: 2025,
            thresholdLower: 25000000,
            thresholdUpper: 100000000,
            ratePercentage: 20,
            description: "Small companies 20% CIT rate",
          },
          {
            id: "rule-3",
            taxType: "VAT",
            year: 2025,
            thresholdLower: 25000000,
            thresholdUpper: null,
            ratePercentage: 7.5,
            description: "VAT applies above ₦25m turnover",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, [adminKey, apiUrl]);

  const startEdit = (rule: TaxRule) => {
    setEditingId(rule.id);
    setEditForm({ ...rule });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setCreating(false);
  };

  const saveRule = async () => {
    try {
      if (creating) {
        const res = await fetch(`${apiUrl}/admin/tax-rules`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify(editForm),
        });
        const newRule = await res.json();
        setRules([newRule, ...rules]);
      } else if (editingId) {
        await fetch(`${apiUrl}/admin/tax-rules/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify(editForm),
        });
        setRules(
          rules.map((r) =>
            r.id === editingId ? { ...r, ...editForm } : r
          ) as TaxRule[]
        );
      }
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      cancelEdit();
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setEditForm({
      taxType: "CIT",
      year: new Date().getFullYear(),
      thresholdLower: 0,
      thresholdUpper: null,
      ratePercentage: 0,
      description: "",
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading tax rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tax Rules</h1>
          <p className="text-sm text-slate-500">
            Configure tax thresholds, rates, and eligibility rules.
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Rule
        </Button>
      </div>

      {creating && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              New Tax Rule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                value={editForm.taxType || "CIT"}
                onChange={(e) =>
                  setEditForm({ ...editForm, taxType: e.target.value })
                }
              >
                <option value="CIT">CIT</option>
                <option value="VAT">VAT</option>
                <option value="WHT">WHT</option>
                <option value="PAYE">PAYE</option>
              </select>
              <Input
                type="number"
                placeholder="Year"
                value={editForm.year || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, year: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                type="number"
                placeholder="Lower threshold"
                value={editForm.thresholdLower || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    thresholdLower: parseFloat(e.target.value),
                  })
                }
              />
              <Input
                type="number"
                placeholder="Upper threshold (optional)"
                value={editForm.thresholdUpper || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    thresholdUpper: e.target.value
                      ? parseFloat(e.target.value)
                      : null,
                  })
                }
              />
              <Input
                type="number"
                placeholder="Rate %"
                value={editForm.ratePercentage || ""}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    ratePercentage: parseFloat(e.target.value),
                  })
                }
              />
            </div>
            <Input
              placeholder="Description"
              value={editForm.description || ""}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveRule}>
                <Save className="mr-1.5 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEdit}>
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="py-4">
              {editingId === rule.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      value={editForm.taxType || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, taxType: e.target.value })
                      }
                    >
                      <option value="CIT">CIT</option>
                      <option value="VAT">VAT</option>
                      <option value="WHT">WHT</option>
                      <option value="PAYE">PAYE</option>
                    </select>
                    <Input
                      type="number"
                      value={editForm.year || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          year: parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      type="number"
                      value={editForm.thresholdLower || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          thresholdLower: parseFloat(e.target.value),
                        })
                      }
                    />
                    <Input
                      type="number"
                      value={editForm.thresholdUpper || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          thresholdUpper: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                    />
                    <Input
                      type="number"
                      value={editForm.ratePercentage || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          ratePercentage: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                  <Input
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveRule}>
                      <Save className="mr-1.5 h-4 w-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      <X className="mr-1.5 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {rule.taxType}
                      </span>
                      <span className="text-xs text-slate-500">
                        {rule.year}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {rule.description}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatCurrency(rule.thresholdLower)}
                      {rule.thresholdUpper
                        ? ` – ${formatCurrency(rule.thresholdUpper)}`
                        : "+"}{" "}
                      @ {rule.ratePercentage}%
                    </p>
                  </div>
                  <button
                    onClick={() => startEdit(rule)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

