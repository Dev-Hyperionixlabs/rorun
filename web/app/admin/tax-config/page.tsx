"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Save, X, AlertCircle, Info } from "lucide-react";
import { ErrorState } from "@/components/ui/page-state";
import { getAdminKey } from "@/lib/admin-key";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface TaxRule {
  id: string;
  taxType: string;
  year: number;
  thresholdMin: number | null;
  thresholdMax: number | null;
  conditionExpression: string | null;
  resultJson: {
    rate?: number;
    exempt?: boolean;
    required?: boolean;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const TAX_TYPE_OPTIONS = [
  { value: "CIT", label: "CIT (Company Income Tax)", description: "Annual company income tax based on profits" },
  { value: "VAT", label: "VAT (Value Added Tax)", description: "Tax on goods and services, typically 7.5%" },
  { value: "WHT", label: "WHT (Withholding Tax)", description: "Tax deducted at source on certain payments" },
  { value: "PAYE", label: "PAYE (Pay As You Earn)", description: "Employee income tax deducted from salaries" },
  { value: "EDT", label: "EDT (Education Tax)", description: "2% education tax on assessable profits" },
];

const HELP_TEXT = {
  thresholdMin: "Minimum annual turnover (₦) for this rule to apply. Leave empty for no minimum.",
  thresholdMax: "Maximum annual turnover (₦). Leave empty for no upper limit (applies to all above minimum).",
  rate: "Tax rate percentage (e.g., 7.5 for VAT, 20 for small company CIT).",
  exempt: "Check if businesses in this threshold range are exempt from this tax.",
  required: "Check if businesses must register for this tax type.",
  conditionExpression: "Advanced: JSON expression for additional conditions (optional).",
};

export default function TaxConfigPage() {
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const adminKey = getAdminKey();
      if (!adminKey) {
        setError("Admin key missing. Please log in.");
        return;
      }
      const res = await fetch(`${API_BASE}/admin/tax-rules`, {
        headers: { "x-admin-key": adminKey },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Unauthorized. Please check your admin key.");
        } else {
          const text = await res.text();
          setError(text || `Failed to load rules (${res.status})`);
        }
        return;
      }
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to connect to API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const startEdit = (rule: TaxRule) => {
    setEditingId(rule.id);
    setEditForm({
      taxType: rule.taxType,
      year: rule.year,
      thresholdMin: rule.thresholdMin ?? "",
      thresholdMax: rule.thresholdMax ?? "",
      conditionExpression: rule.conditionExpression ?? "",
      rate: rule.resultJson?.rate ?? "",
      exempt: rule.resultJson?.exempt ?? false,
      required: rule.resultJson?.required ?? true,
      description: rule.resultJson?.description ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setCreating(false);
  };

  const saveRule = async () => {
    setSaving(true);
    try {
      const adminKey = getAdminKey();
      const payload = {
        taxType: editForm.taxType,
        year: parseInt(editForm.year) || new Date().getFullYear(),
        thresholdMin: editForm.thresholdMin !== "" ? parseFloat(editForm.thresholdMin) : null,
        thresholdMax: editForm.thresholdMax !== "" ? parseFloat(editForm.thresholdMax) : null,
        conditionExpression: editForm.conditionExpression || null,
        resultJson: {
          rate: editForm.rate !== "" ? parseFloat(editForm.rate) : undefined,
          exempt: editForm.exempt,
          required: editForm.required,
          description: editForm.description || undefined,
        },
      };

      if (creating) {
        const res = await fetch(`${API_BASE}/admin/tax-rules`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey || "",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create rule");
        await fetchRules();
      } else if (editingId) {
        const res = await fetch(`${API_BASE}/admin/tax-rules/${editingId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey || "",
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update rule");
        await fetchRules();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save rule");
    } finally {
      setSaving(false);
      cancelEdit();
    }
  };

  const startCreate = () => {
    setCreating(true);
    setEditingId(null);
    setEditForm({
      taxType: "CIT",
      year: new Date().getFullYear(),
      thresholdMin: "",
      thresholdMax: "",
      conditionExpression: "",
      rate: "",
      exempt: false,
      required: true,
      description: "",
    });
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined || isNaN(val)) return "—";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading tax rules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tax Rules</h1>
          <p className="text-sm text-slate-500">Configure tax thresholds and eligibility.</p>
        </div>
        <ErrorState title="Couldn't load tax rules" message={error} onRetry={fetchRules} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tax Rules</h1>
          <p className="text-sm text-slate-500">
            Configure tax thresholds, rates, and eligibility rules for Nigerian SMEs.
          </p>
        </div>
        <Button onClick={startCreate} disabled={creating}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800">
          <p className="font-semibold">How tax rules work</p>
          <p className="mt-1">
            Rules define thresholds and rates for each tax type. When a business&apos;s annual turnover 
            falls within a threshold range, the corresponding rate and eligibility apply. 
            Changes here affect all businesses after their next eligibility check.
          </p>
        </div>
      </div>

      {/* Preview Panel */}
      <PreviewImpactPanel rules={rules} />

      {/* Create form */}
      {creating && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900">
              New Tax Rule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RuleForm editForm={editForm} setEditForm={setEditForm} />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveRule} disabled={saving}>
                <Save className="mr-1.5 h-4 w-4" />
                {saving ? "Saving..." : "Save Rule"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No tax rules configured yet.</p>
            <p className="text-xs text-slate-400 mt-1">Click &quot;New Rule&quot; to add your first tax rule.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                {editingId === rule.id ? (
                  <div className="space-y-4">
                    <RuleForm editForm={editForm} setEditForm={setEditForm} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveRule} disabled={saving}>
                        <Save className="mr-1.5 h-4 w-4" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="mr-1.5 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          {rule.taxType}
                        </span>
                        <span className="text-xs text-slate-500">
                          {rule.year}
                        </span>
                        {rule.resultJson?.exempt && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Exempt
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900">
                        {rule.resultJson?.description || `${rule.taxType} rule for ${rule.year}`}
                      </p>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>
                          Turnover: {formatCurrency(rule.thresholdMin)}
                          {rule.thresholdMax ? ` – ${formatCurrency(rule.thresholdMax)}` : "+"}
                        </span>
                        {rule.resultJson?.rate !== undefined && (
                          <span>Rate: {rule.resultJson.rate}%</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Updated: {new Date(rule.updatedAt).toLocaleDateString()}
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
      )}
    </div>
  );
}

function PreviewImpactPanel({ rules }: { rules: TaxRule[] }) {
  const [turnover, setTurnover] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [legalForm, setLegalForm] = useState("company");

  const numTurnover = parseFloat(turnover.replace(/,/g, "")) || 0;

  // Find matching rules for each tax type
  const matchingRules = TAX_TYPE_OPTIONS.map(({ value: taxType, label }) => {
    const matching = rules
      .filter((r) => r.taxType === taxType && r.year === year)
      .filter((r) => {
        const min = r.thresholdMin ?? 0;
        const max = r.thresholdMax ?? Infinity;
        return numTurnover >= min && numTurnover <= max;
      })
      .sort((a, b) => (b.thresholdMin ?? 0) - (a.thresholdMin ?? 0));

    const rule = matching[0];
    return {
      taxType,
      label,
      rule,
      status: rule
        ? rule.resultJson?.exempt
          ? "exempt"
          : rule.resultJson?.required === false
          ? "optional"
          : "required"
        : "unknown",
      rate: rule?.resultJson?.rate,
      description: rule?.resultJson?.description,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-900">
          Preview Impact
        </CardTitle>
        <p className="text-xs text-slate-500">
          Test how your rules apply to a hypothetical business.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Annual Turnover (₦)</label>
            <Input
              type="text"
              placeholder="e.g. 15,000,000"
              value={turnover}
              onChange={(e) => setTurnover(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Tax Year</label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || new Date().getFullYear())}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Business Type</label>
            <select
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              value={legalForm}
              onChange={(e) => setLegalForm(e.target.value)}
            >
              <option value="sole_proprietor">Sole Proprietor</option>
              <option value="partnership">Partnership</option>
              <option value="company">Company (LLC/Ltd)</option>
            </select>
          </div>
        </div>

        {numTurnover > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Tax Status for ₦{numTurnover.toLocaleString()} turnover in {year}:
            </p>
            <div className="space-y-1.5">
              {matchingRules.map((m) => (
                <div
                  key={m.taxType}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-slate-700">{m.label.split(" ")[0]}</span>
                  <div className="flex items-center gap-2">
                    {m.status === "exempt" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 text-[10px] font-medium">
                        Exempt
                      </span>
                    )}
                    {m.status === "required" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700 text-[10px] font-medium">
                        Required {m.rate !== undefined && `@ ${m.rate}%`}
                      </span>
                    )}
                    {m.status === "optional" && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600 text-[10px] font-medium">
                        Optional
                      </span>
                    )}
                    {m.status === "unknown" && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 text-[10px] font-medium">
                        No rule
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {matchingRules.some((m) => m.description) && (
              <p className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200">
                {matchingRules.find((m) => m.description)?.description}
              </p>
            )}
          </div>
        )}

        {numTurnover === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">
            Enter a turnover amount to preview tax status
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RuleForm({
  editForm,
  setEditForm,
}: {
  editForm: any;
  setEditForm: (v: any) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Tax Type & Year */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Tax Type</label>
          <select
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={editForm.taxType || "CIT"}
            onChange={(e) => setEditForm({ ...editForm, taxType: e.target.value })}
          >
            {TAX_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400">
            {TAX_TYPE_OPTIONS.find((o) => o.value === editForm.taxType)?.description}
          </p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Tax Year</label>
          <Input
            type="number"
            placeholder="e.g. 2025"
            value={editForm.year || ""}
            onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
          />
          <p className="text-[10px] text-slate-400">Year this rule applies to</p>
        </div>
      </div>

      {/* Thresholds */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Minimum Turnover (₦)</label>
          <Input
            type="number"
            placeholder="e.g. 0 or 25000000"
            value={editForm.thresholdMin || ""}
            onChange={(e) => setEditForm({ ...editForm, thresholdMin: e.target.value })}
          />
          <p className="text-[10px] text-slate-400">{HELP_TEXT.thresholdMin}</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Maximum Turnover (₦)</label>
          <Input
            type="number"
            placeholder="Leave empty for no limit"
            value={editForm.thresholdMax || ""}
            onChange={(e) => setEditForm({ ...editForm, thresholdMax: e.target.value })}
          />
          <p className="text-[10px] text-slate-400">{HELP_TEXT.thresholdMax}</p>
        </div>
      </div>

      {/* Rate & Flags */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Rate (%)</label>
          <Input
            type="number"
            step="0.1"
            placeholder="e.g. 7.5"
            value={editForm.rate || ""}
            onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
          />
          <p className="text-[10px] text-slate-400">{HELP_TEXT.rate}</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Exempt?</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="exempt"
              checked={editForm.exempt || false}
              onChange={(e) => setEditForm({ ...editForm, exempt: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="exempt" className="text-xs text-slate-600">
              Businesses are exempt
            </label>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Required?</label>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="required"
              checked={editForm.required ?? true}
              onChange={(e) => setEditForm({ ...editForm, required: e.target.checked })}
              className="rounded border-slate-300"
            />
            <label htmlFor="required" className="text-xs text-slate-600">
              Registration required
            </label>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-700">Description</label>
        <Input
          placeholder="e.g. Micro businesses exempt from CIT"
          value={editForm.description || ""}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
        />
        <p className="text-[10px] text-slate-400">Human-readable explanation shown to users</p>
      </div>
    </div>
  );
}
