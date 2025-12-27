"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useFeatures } from "@/hooks/use-features";
import {
  startFilingWizard,
  getFilingRun,
  updateFilingWizardStep,
  completeFilingWizard,
  FilingRun,
  FilingRunComputed,
} from "@/lib/api/filingWizard";
import { getBusiness, getBusinesses } from "@/lib/api/businesses";
import { getLatestSnapshot, ObligationSnapshot } from "@/lib/api/taxRules";
import { getReviewIssues } from "@/lib/api/review";
import {
  Loader2,
  CheckCircle2,
  Circle,
  Lock,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const STEPS = [
  { id: "confirm_business", label: "Confirm business", icon: CheckCircle2 },
  { id: "income", label: "Income", icon: FileText },
  { id: "expenses", label: "Expenses", icon: FileText },
  { id: "evidence", label: "Evidence", icon: Upload },
  { id: "review", label: "Review", icon: CheckCircle2 },
] as const;

export default function FilingWizardPage() {
  const params = useParams();
  const router = useRouter();
  const taxYear = parseInt(params.taxYear as string);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [run, setRun] = useState<FilingRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [snapshot, setSnapshot] = useState<ObligationSnapshot | null>(null);
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);
  const { hasFeature } = useFeatures(businessId);
  const { addToast } = useToast();

  const canAccess = hasFeature("yearEndFilingPack");

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    if (businessId && canAccess) {
      loadRun();
      loadSnapshot();
      loadOpenIssues();
    }
  }, [businessId, canAccess]);

  const loadOpenIssues = async () => {
    if (!businessId) return;
    try {
      const issues = await getReviewIssues(businessId, {
        taxYear,
        status: "open",
      });
      setOpenIssuesCount(issues.length);
    } catch {
      setOpenIssuesCount(0);
    }
  };

  const loadSnapshot = async () => {
    if (!businessId) return;
    try {
      const latest = await getLatestSnapshot(businessId);
      setSnapshot(latest);
    } catch (error: any) {
      // Snapshot may not exist yet, that's okay
      console.log("No snapshot found:", error);
    }
  };

  const loadBusiness = async () => {
    try {
      const businesses = await getBusinesses();
      if (businesses && businesses.length > 0) {
        setBusinessId(businesses[0].id);
      }
    } catch (error: any) {
      console.error("Failed to load business:", error);
    }
  };

  const loadRun = async () => {
    if (!businessId) return;

    try {
      setLoading(true);
      try {
        const existing = await getFilingRun(businessId, taxYear);
        setRun(existing);
      } catch (error: any) {
        if (error.status === 404) {
          // Start new run
          const newRun = await startFilingWizard(businessId, taxYear);
          setRun(newRun);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      addToast({
        title: "Failed to load wizard",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStepUpdate = async (
    step: string,
    answersPatch: Partial<FilingRun["answersJson"]>
  ) => {
    if (!businessId || !run) return;

    try {
      setSaving(true);
      const updated = await updateFilingWizardStep(
        businessId,
        taxYear,
        run.kind,
        step,
        answersPatch
      );
      setRun(updated);
    } catch (error: any) {
      addToast({
        title: "Failed to save",
        description: error?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!businessId || !run) return;

    try {
      setCompleting(true);
      const result = await completeFilingWizard(businessId, taxYear, run.kind);
      setRun(result.run);
      addToast({
        title: "Wizard completed",
        description: "Filing pack generation has been queued.",
        variant: "success",
      });
      router.push(`/app/summary`);
    } catch (error: any) {
      addToast({
        title: "Failed to complete",
        description: error?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Annual Return Preparation
          </h1>
          <p className="text-sm text-slate-500">
            Guided wizard to prepare your annual return filing.
          </p>
        </div>
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Lock className="h-12 w-12 text-amber-500" />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Plan upgrade required
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  The filing wizard requires Basic plan or higher.
                </p>
              </div>
              <Link href="/app/pricing">
                <Button variant="secondary">Upgrade to unlock</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || !run) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === run.currentStep);
  const computed = run.computedJson;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Annual Return Preparation
        </h1>
        <p className="text-sm text-slate-500">
          Tax Year {taxYear} • Step {currentStepIndex + 1} of {STEPS.length}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        {/* Step list */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = step.id === run.currentStep;
                const isCompleted = index < currentStepIndex;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 text-sm ${
                      isActive
                        ? "font-semibold text-slate-900"
                        : isCompleted
                        ? "text-slate-600"
                        : "text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : isActive ? (
                      <Circle className="h-4 w-4 fill-slate-900 text-slate-900" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Step content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-800">
              {STEPS[currentStepIndex]?.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {run.currentStep === "confirm_business" && (
              <ConfirmBusinessStep
                businessId={businessId!}
                taxYear={taxYear}
                onNext={() => handleStepUpdate("income", {})}
                saving={saving}
              />
            )}

            {run.currentStep === "income" && computed && (
              <IncomeStep
                computed={computed}
                answers={run.answersJson}
                onNext={(answers) => handleStepUpdate("expenses", answers)}
                saving={saving}
              />
            )}

            {run.currentStep === "expenses" && computed && (
              <ExpensesStep
                computed={computed}
                answers={run.answersJson}
                onNext={(answers) => handleStepUpdate("evidence", answers)}
                saving={saving}
              />
            )}

            {run.currentStep === "evidence" && computed && (
              <EvidenceStep
                computed={computed}
                businessId={businessId!}
                taxYear={taxYear}
                onNext={() => handleStepUpdate("review", {})}
                saving={saving}
              />
            )}

            {run.currentStep === "review" && computed && (
              <ReviewStep
                computed={computed}
                answers={run.answersJson}
                snapshot={snapshot}
                openIssuesCount={openIssuesCount}
                onComplete={handleComplete}
                completing={completing}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConfirmBusinessStep({
  businessId,
  taxYear,
  onNext,
  saving,
}: {
  businessId: string;
  taxYear: number;
  onNext: () => void;
  saving: boolean;
}) {
  const [business, setBusiness] = useState<any>(null);

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      const found = await getBusiness(businessId);
      if (found) setBusiness(found);
    } catch (error) {
      console.error("Failed to load business:", error);
    }
  };

  if (!business) {
    return <div>Loading business details...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-slate-700">Business name:</p>
        <p className="text-sm font-medium text-slate-900">{business.name}</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-700">Tax year:</p>
        <p className="text-sm font-medium text-slate-900">{taxYear}</p>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-slate-700">Legal form:</p>
        <p className="text-sm font-medium text-slate-900">
          {business.legalForm || "Not set"}
        </p>
      </div>
      <div className="pt-4 border-t border-slate-200">
        <Link href="/app/settings" className="text-xs text-emerald-600 hover:text-emerald-700">
          Edit business details →
        </Link>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onNext} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          Continue <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function IncomeStep({
  computed,
  answers,
  onNext,
  saving,
}: {
  computed: FilingRunComputed;
  answers: FilingRun["answersJson"];
  onNext: (answers: Partial<FilingRun["answersJson"]>) => void;
  saving: boolean;
}) {
  const [incomeAdjustments, setIncomeAdjustments] = useState(
    answers.incomeAdjustments?.toString() || ""
  );
  const [note, setNote] = useState(answers.incomeAdjustmentNote || "");

  const handleNext = () => {
    const adjustments = incomeAdjustments
      ? parseFloat(incomeAdjustments)
      : undefined;
    onNext({
      incomeAdjustments: adjustments,
      incomeAdjustmentNote: note || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500 mb-1">Computed income total</p>
        <p className="text-lg font-semibold text-slate-900">
          ₦{computed.incomeTotal.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Based on {computed.monthsCovered} months of transaction data
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Income adjustments (optional)
        </label>
        <p className="text-xs text-slate-500">
          Add any income not captured in transactions (e.g., cash sales)
        </p>
        <Input
          type="number"
          placeholder="0"
          value={incomeAdjustments}
          onChange={(e) => setIncomeAdjustments(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Note (optional)</label>
        <Textarea
          placeholder="Explain the adjustment..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleNext} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          Continue <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ExpensesStep({
  computed,
  answers,
  onNext,
  saving,
}: {
  computed: FilingRunComputed;
  answers: FilingRun["answersJson"];
  onNext: (answers: Partial<FilingRun["answersJson"]>) => void;
  saving: boolean;
}) {
  const [expenseAdjustments, setExpenseAdjustments] = useState(
    answers.expenseAdjustments?.toString() || ""
  );
  const [note, setNote] = useState(answers.expenseAdjustmentNote || "");

  const handleNext = () => {
    const adjustments = expenseAdjustments
      ? parseFloat(expenseAdjustments)
      : undefined;
    onNext({
      expenseAdjustments: adjustments,
      expenseAdjustmentNote: note || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs text-slate-500 mb-1">Computed expense total</p>
        <p className="text-lg font-semibold text-slate-900">
          ₦{computed.expenseTotal.toLocaleString()}
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">
          Expense adjustments (optional)
        </label>
        <p className="text-xs text-slate-500">
          Add any expenses not captured in transactions (e.g., one-off purchases)
        </p>
        <Input
          type="number"
          placeholder="0"
          value={expenseAdjustments}
          onChange={(e) => setExpenseAdjustments(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Note (optional)</label>
        <Textarea
          placeholder="Explain the adjustment..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleNext} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          Continue <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function EvidenceStep({
  computed,
  businessId,
  taxYear,
  onNext,
  saving,
}: {
  computed: FilingRunComputed;
  businessId: string;
  taxYear: number;
  onNext: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {computed.flags.missingMonths && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Missing transaction data
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  No transactions found for: {computed.missingMonths.join(", ")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-2">Evidence coverage</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Receipts:</span>
              <span className="font-medium text-slate-900">
                {computed.evidenceCoverage.receiptsCount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Expense transactions:</span>
              <span className="font-medium text-slate-900">
                {computed.evidenceCoverage.transactionsCount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Coverage ratio:</span>
              <span className="font-medium text-slate-900">
                {(computed.evidenceCoverage.coverageRatio * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {computed.flags.lowEvidenceCoverage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900">
                  Low evidence coverage
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Consider uploading more receipts to support your expenses.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Link href="/app/transactions?import=true">
          <Button variant="secondary" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Import statement
          </Button>
        </Link>
        <Link href="/app/documents">
          <Button variant="secondary" className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload receipts
          </Button>
        </Link>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={onNext} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          Continue <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ReviewStep({
  computed,
  answers,
  snapshot,
  openIssuesCount,
  onComplete,
  completing,
}: {
  computed: FilingRunComputed;
  answers: FilingRun["answersJson"];
  snapshot: ObligationSnapshot | null;
  openIssuesCount: number;
  onComplete: () => void;
  completing: boolean;
}) {
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'zero':
        return 'Zero-rated';
      case 'standard':
        return 'Standard rate';
      case 'exempt':
        return 'Exempt';
      case 'required':
        return 'Required';
      case 'not_required':
        return 'Not required';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {openIssuesCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Review needed</p>
          <p className="text-xs text-amber-800 mt-1">
            You have {openIssuesCount} open issue{openIssuesCount !== 1 ? "s" : ""} that may affect filing accuracy.
          </p>
          <Link href="/app/review" className="inline-block mt-2 text-xs font-semibold text-amber-900 underline">
            Go to Review issues
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-2">Final totals</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Income:</span>
              <span className="text-sm font-semibold text-slate-900">
                ₦{computed.incomeTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Expenses:</span>
              <span className="text-sm font-semibold text-slate-900">
                ₦{computed.expenseTotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-700">Profit:</span>
              <span className="text-sm font-semibold text-emerald-600">
                ₦{computed.profitEstimate.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {snapshot && snapshot.outputs && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500 mb-2">Tax obligations</p>
            <div className="space-y-2">
              {snapshot.outputs.citStatus && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">CIT Status:</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {getStatusLabel(snapshot.outputs.citStatus)}
                  </span>
                </div>
              )}
              {snapshot.outputs.vatStatus && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">VAT Status:</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {getStatusLabel(snapshot.outputs.vatStatus)}
                  </span>
                </div>
              )}
              {snapshot.outputs.whtStatus && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">WHT Status:</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {getStatusLabel(snapshot.outputs.whtStatus)}
                  </span>
                </div>
              )}
              {snapshot.explanations && Object.keys(snapshot.explanations).length > 0 && (
                <div className="pt-2 border-t border-slate-200">
                  {Object.entries(snapshot.explanations).map(([key, explanation]) => (
                    <p key={key} className="text-xs text-slate-600 mt-1">
                      {explanation}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {answers.incomeAdjustments && (
          <div className="text-xs text-slate-500">
            Income adjustment: ₦{answers.incomeAdjustments.toLocaleString()}
            {answers.incomeAdjustmentNote && ` (${answers.incomeAdjustmentNote})`}
          </div>
        )}

        {answers.expenseAdjustments && (
          <div className="text-xs text-slate-500">
            Expense adjustment: ₦{answers.expenseAdjustments.toLocaleString()}
            {answers.expenseAdjustmentNote && ` (${answers.expenseAdjustmentNote})`}
          </div>
        )}

        {computed.flags.turnoverThresholdWatch && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Turnover threshold watch
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Your business may be approaching or exceeding certain tax thresholds.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <Button
          onClick={onComplete}
          disabled={completing}
          className="w-full bg-emerald-600 hover:bg-emerald-700"
        >
          {completing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Completing...
            </>
          ) : (
            "Mark ready & generate pack"
          )}
        </Button>
        <p className="text-xs text-slate-500 mt-2 text-center">
          This will queue filing pack generation (Phase 6)
        </p>
      </div>
    </div>
  );
}

