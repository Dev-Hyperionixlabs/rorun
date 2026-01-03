"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/page-state";
import { CheckCircle2, Info, Play, Plus, RefreshCw } from "lucide-react";
import {
  AdminDeadlineTemplate,
  AdminTaxRuleSet,
  AdminTaxRuleV2,
  createAdminDeadlineTemplate,
  createAdminTaxRule,
  createAdminTaxRuleSet,
  getAdminTaxRuleSet,
  getAdminTaxRuleSets,
  testAdminTaxEvaluation,
  updateAdminTaxRuleSet,
} from "@/lib/api/admin";

function safeParseJson(text: string): { ok: true; value: any } | { ok: false; error: string } {
  try {
    if (!text.trim()) return { ok: true, value: {} };
    return { ok: true, value: JSON.parse(text) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Invalid JSON" };
  }
}

export default function TaxConfigPage() {
  const [ruleSets, setRuleSets] = useState<AdminTaxRuleSet[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selected, setSelected] = useState<
    (AdminTaxRuleSet & { rules: AdminTaxRuleV2[]; deadlineTemplates: AdminDeadlineTemplate[] }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creatingSet, setCreatingSet] = useState(false);
  const [creatingRule, setCreatingRule] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const [newSet, setNewSet] = useState({
    version: "",
    name: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    description: "",
  });

  const [newRule, setNewRule] = useState({
    key: "",
    type: "eligibility" as AdminTaxRuleV2["type"],
    priority: 10,
    conditionsJson: "{\n  \"all\": []\n}",
    outcomeJson: "{\n  \"citStatus\": \"unknown\"\n}",
    explanation: "",
  });

  const [newTemplate, setNewTemplate] = useState({
    key: "",
    frequency: "annual" as AdminDeadlineTemplate["frequency"],
    dueDayOfMonth: "",
    dueMonth: "",
    dueDay: "",
    offsetDays: "",
    appliesWhenJson: "{\n  \"all\": []\n}",
    title: "",
    description: "",
  });

  const [testYear, setTestYear] = useState<number>(new Date().getFullYear());
  const [testProfileJson, setTestProfileJson] = useState(
    JSON.stringify(
      {
        legalForm: "company",
        sector: "general",
        state: "Lagos",
        estimatedTurnoverBand: "small",
        vatRegistered: false,
      },
      null,
      2,
    ),
  );
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const refresh = async () => {
    const sets = await getAdminTaxRuleSets();
    setRuleSets(Array.isArray(sets) ? sets : []);
    if (selectedId) {
      const detail = await getAdminTaxRuleSet(selectedId);
      setSelected(detail);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setLoading(true);
        const sets = await getAdminTaxRuleSets();
        setRuleSets(Array.isArray(sets) ? sets : []);
        const active = (sets || []).find((s) => s.status === "active");
        if (active?.id) setSelectedId(active.id);
        else if ((sets || [])[0]?.id) setSelectedId((sets || [])[0].id);
      } catch (e: any) {
        setError(e?.message || "Failed to load tax rule sets.");
      } finally {
        setLoading(false);
      }
    })().catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        setError(null);
        const detail = await getAdminTaxRuleSet(selectedId);
        setSelected(detail);
      } catch (e: any) {
        setSelected(null);
        setError(e?.message || "Failed to load rule set detail.");
      }
    })().catch(() => {});
  }, [selectedId]);

  const selectedStatus =
    selected?.status || (ruleSets.find((r) => r.id === selectedId)?.status ?? "draft");
  const statusBadge = useMemo(() => {
    if (selectedStatus === "active") return "bg-emerald-50 text-emerald-700";
    if (selectedStatus === "archived") return "bg-slate-100 text-slate-600";
    return "bg-amber-50 text-amber-700";
  }, [selectedStatus]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-slate-500">Loading tax config…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tax Config</h1>
          <p className="text-sm text-slate-500">Manage rule sets and deadline templates.</p>
        </div>
        <ErrorState title="Couldn't load tax config" message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Tax Config</h1>
          <p className="text-sm text-slate-500">
            Rule sets define what applies, why, and when it’s due. Activate a set to affect evaluations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              setBusy(true);
              try {
                await refresh();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setCreatingSet(true)} disabled={creatingSet}>
          <Plus className="mr-1.5 h-4 w-4" />
            New rule set
        </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800">
          <p className="font-semibold">How this affects the main app</p>
          <p className="mt-1">
            The Tax Rules Engine evaluates a business profile and produces obligations + deadlines. Use “Preview impact”
            below to verify what users will see after re-evaluation.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Rule sets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedId}
              onChange={setSelectedId}
              options={[
                { value: "", label: "Select rule set…" },
                ...ruleSets.map((rs) => ({
                  value: rs.id,
                  label: `${rs.version} • ${rs.status.toUpperCase()} • ${rs.name}`,
                })),
              ]}
            />
            <div className="text-xs text-slate-500">Active rule set affects evaluations immediately.</div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {creatingSet && (
            <Card className="bg-white border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">New rule set</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Version</label>
              <Input
                    value={newSet.version}
                    onChange={(e) => setNewSet((s) => ({ ...s, version: e.target.value }))}
                    placeholder="e.g. 2026.1"
              />
            </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Name</label>
              <Input
                    value={newSet.name}
                    onChange={(e) => setNewSet((s) => ({ ...s, name: e.target.value }))}
                    placeholder="Nigeria SME Tax Reform 2026 - v1"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Effective from</label>
              <Input
                    type="date"
                    value={newSet.effectiveFrom}
                    onChange={(e) => setNewSet((s) => ({ ...s, effectiveFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Description (optional)</label>
              <Input
                    value={newSet.description}
                    onChange={(e) => setNewSet((s) => ({ ...s, description: e.target.value }))}
                    placeholder="What changed in this version?"
              />
            </div>
                <div className="flex gap-2 md:col-span-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (!newSet.version.trim() || !newSet.name.trim()) return;
                      setBusy(true);
                      try {
                        const created = await createAdminTaxRuleSet({
                          version: newSet.version.trim(),
                          name: newSet.name.trim(),
                          effectiveFrom: new Date(newSet.effectiveFrom).toISOString(),
                          description: newSet.description.trim() || undefined,
                        });
                        await refresh();
                        setCreatingSet(false);
                        setSelectedId(created.id);
                      } catch (e: any) {
                        setError(e?.message || "Failed to create rule set.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={busy || !newSet.version.trim() || !newSet.name.trim()}
                  >
                    Create
              </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCreatingSet(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

          {!selected ? (
            <Card className="bg-white">
              <CardContent className="py-10 text-center text-sm text-slate-500">
                Select a rule set to view details.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    {selected.version} • {selected.name}{" "}
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge}`}>
                      {selected.status.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs text-slate-600">
                    Effective from <span className="font-semibold">{new Date(selected.effectiveFrom).toLocaleDateString()}</span>
                    {selected.effectiveTo ? (
                      <> to <span className="font-semibold">{new Date(selected.effectiveTo).toLocaleDateString()}</span></>
                    ) : (
                      <> (no end date)</>
                    )}
                    {selected.description ? <div className="mt-1">{selected.description}</div> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await updateAdminTaxRuleSet(selected.id, { status: "active" });
                          await refresh();
                        } catch (e: any) {
                          setError(e?.message || "Failed to activate rule set.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy || selected.status === "active"}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Activate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">Preview impact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">Tax year</label>
                      <Input inputMode="numeric" value={String(testYear)} onChange={(e) => setTestYear(Number(e.target.value || new Date().getFullYear()))} />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-slate-700">Business profile (JSON)</label>
                      <textarea
                        className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-xs"
                        rows={6}
                        value={testProfileJson}
                        onChange={(e) => setTestProfileJson(e.target.value)}
                      />
                    </div>
                  </div>
                  {testError && <div className="text-xs font-semibold text-rose-600">{testError}</div>}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={async () => {
                        const parsed = safeParseJson(testProfileJson);
                        if (!parsed.ok) {
                          setTestError(parsed.error);
                          return;
                        }
                        setBusy(true);
                        setTestError(null);
                        try {
                          const res = await testAdminTaxEvaluation(selected.id, { businessProfile: parsed.value, taxYear: testYear });
                          setTestResult(res);
                        } catch (e: any) {
                          setTestResult(null);
                          setTestError(e?.message || "Test failed.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy}
                    >
                      <Play className="mr-1.5 h-4 w-4" />
                      Run preview
                    </Button>
                  </div>
                  {testResult && (
                    <pre className="overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-900">Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-slate-500">
                      Rules define outcomes (eligibility/obligation/deadline/threshold) based on JSON conditions.
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setCreatingRule((v) => !v)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add rule
                    </Button>
                    {creatingRule && (
                      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Key</label>
                            <Input value={newRule.key} onChange={(e) => setNewRule((s) => ({ ...s, key: e.target.value }))} placeholder="cit_eligibility_small_business" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Type</label>
                            <Select
                              value={newRule.type}
                              onChange={(v) => setNewRule((s) => ({ ...s, type: v as any }))}
                              options={[
                                { value: "eligibility", label: "eligibility" },
                                { value: "obligation", label: "obligation" },
                                { value: "deadline", label: "deadline" },
                                { value: "threshold", label: "threshold" },
                              ]}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Priority</label>
                            <Input inputMode="numeric" value={String(newRule.priority)} onChange={(e) => setNewRule((s) => ({ ...s, priority: Number(e.target.value || 0) }))} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Explanation</label>
                            <Input value={newRule.explanation} onChange={(e) => setNewRule((s) => ({ ...s, explanation: e.target.value }))} placeholder="Why does this rule match?" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Conditions JSON</label>
                          <textarea className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-xs" rows={5} value={newRule.conditionsJson} onChange={(e) => setNewRule((s) => ({ ...s, conditionsJson: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Outcome JSON</label>
                          <textarea className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-xs" rows={5} value={newRule.outcomeJson} onChange={(e) => setNewRule((s) => ({ ...s, outcomeJson: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              const c = safeParseJson(newRule.conditionsJson);
                              const o = safeParseJson(newRule.outcomeJson);
                              if (!c.ok) return setError(`Conditions JSON: ${c.error}`);
                              if (!o.ok) return setError(`Outcome JSON: ${o.error}`);
                              setBusy(true);
                              try {
                                await createAdminTaxRule(selected.id, {
                                  key: newRule.key.trim(),
                                  type: newRule.type,
                                  priority: Number(newRule.priority),
                                  conditionsJson: c.value,
                                  outcomeJson: o.value,
                                  explanation: newRule.explanation.trim(),
                                });
                                await refresh();
                                setCreatingRule(false);
                                setNewRule((s) => ({ ...s, key: "", explanation: "" }));
                              } catch (e: any) {
                                setError(e?.message || "Failed to create rule.");
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy || !newRule.key.trim() || !newRule.explanation.trim()}
                          >
                            Create rule
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setCreatingRule(false)} disabled={busy}>
                            Cancel
                    </Button>
                  </div>
                </div>
                    )}

                    <div className="space-y-2">
                      {(selected.rules || []).length === 0 ? (
                        <div className="text-sm text-slate-500">No rules yet.</div>
                      ) : (
                        selected.rules.map((r) => (
                          <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-slate-900">{r.key}</div>
                              <div className="text-[10px] text-slate-500">
                                {r.type} • p{r.priority}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-slate-600">{r.explanation}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-900">Deadline templates</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-slate-500">
                      Templates define due-date policy (monthly/annual/etc). Engine resolves concrete due dates during evaluation.
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => setCreatingTemplate((v) => !v)}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add template
                    </Button>
                    {creatingTemplate && (
                      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Key</label>
                            <Input value={newTemplate.key} onChange={(e) => setNewTemplate((s) => ({ ...s, key: e.target.value }))} placeholder="annual_return" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">Frequency</label>
                            <Select
                              value={newTemplate.frequency}
                              onChange={(v) => setNewTemplate((s) => ({ ...s, frequency: v as any }))}
                              options={[
                                { value: "monthly", label: "monthly" },
                                { value: "quarterly", label: "quarterly" },
                                { value: "annual", label: "annual" },
                                { value: "one_time", label: "one_time" },
                              ]}
                            />
                          </div>
                        </div>
                        <div className="grid gap-2 md:grid-cols-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">dueDayOfMonth</label>
                            <Input value={newTemplate.dueDayOfMonth} onChange={(e) => setNewTemplate((s) => ({ ...s, dueDayOfMonth: e.target.value }))} placeholder="e.g. 21" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">dueMonth</label>
                            <Input value={newTemplate.dueMonth} onChange={(e) => setNewTemplate((s) => ({ ...s, dueMonth: e.target.value }))} placeholder="e.g. 3" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">dueDay</label>
                            <Input value={newTemplate.dueDay} onChange={(e) => setNewTemplate((s) => ({ ...s, dueDay: e.target.value }))} placeholder="e.g. 31" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-700">offsetDays</label>
                            <Input value={newTemplate.offsetDays} onChange={(e) => setNewTemplate((s) => ({ ...s, offsetDays: e.target.value }))} placeholder="e.g. 30" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Title</label>
                          <Input value={newTemplate.title} onChange={(e) => setNewTemplate((s) => ({ ...s, title: e.target.value }))} placeholder="Annual return filing" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Description</label>
                          <Input value={newTemplate.description} onChange={(e) => setNewTemplate((s) => ({ ...s, description: e.target.value }))} placeholder="What is due and why" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-700">Applies when (JSON)</label>
                          <textarea className="w-full rounded-md border border-slate-200 bg-white p-2 font-mono text-xs" rows={4} value={newTemplate.appliesWhenJson} onChange={(e) => setNewTemplate((s) => ({ ...s, appliesWhenJson: e.target.value }))} />
                  </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              const aw = safeParseJson(newTemplate.appliesWhenJson);
                              if (!aw.ok) return setError(`AppliesWhen JSON: ${aw.error}`);
                              setBusy(true);
                              try {
                                await createAdminDeadlineTemplate(selected.id, {
                                  key: newTemplate.key.trim(),
                                  frequency: newTemplate.frequency,
                                  dueDayOfMonth: newTemplate.dueDayOfMonth ? Number(newTemplate.dueDayOfMonth) : undefined,
                                  dueMonth: newTemplate.dueMonth ? Number(newTemplate.dueMonth) : undefined,
                                  dueDay: newTemplate.dueDay ? Number(newTemplate.dueDay) : undefined,
                                  offsetDays: newTemplate.offsetDays ? Number(newTemplate.offsetDays) : undefined,
                                  appliesWhenJson: aw.value,
                                  title: newTemplate.title.trim(),
                                  description: newTemplate.description.trim(),
                                });
                                await refresh();
                                setCreatingTemplate(false);
                                setNewTemplate((s) => ({ ...s, key: "", title: "", description: "" }));
                              } catch (e: any) {
                                setError(e?.message || "Failed to create template.");
                              } finally {
                                setBusy(false);
                              }
                            }}
                            disabled={busy || !newTemplate.key.trim() || !newTemplate.title.trim() || !newTemplate.description.trim()}
                          >
                            Create template
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setCreatingTemplate(false)} disabled={busy}>
                            Cancel
                          </Button>
                        </div>
                </div>
              )}

                    <div className="space-y-2">
                      {(selected.deadlineTemplates || []).length === 0 ? (
                        <div className="text-sm text-slate-500">No templates yet.</div>
                      ) : (
                        selected.deadlineTemplates.map((t) => (
                          <div key={t.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold text-slate-900">{t.key}</div>
                              <div className="text-[10px] text-slate-500">{t.frequency}</div>
                            </div>
                            <div className="mt-1 text-xs text-slate-600">{t.title}</div>
                          </div>
                        ))
                      )}
                    </div>
            </CardContent>
          </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


