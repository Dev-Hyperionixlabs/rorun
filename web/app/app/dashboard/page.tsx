"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaxSafetyCard } from "@/components/tax-safety-card";
import { RecommendedActionsSection } from "@/components/recommended-actions";
import { ComplianceTasksCard } from "@/components/compliance-tasks-card";
import { useFilingPack } from "@/hooks/use-filing-pack";
import { getReviewIssues } from "@/lib/api/review";
import Link from "next/link";
import { ErrorState } from "@/components/ui/page-state";
import { getEligibilityResult, runEligibilityCheck } from "@/lib/api/eligibility";
import { useToast } from "@/components/ui/toast";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const { businesses, transactions, alerts, currentPlanId, currentBusinessId, loading, error, refresh } = useMockApi();
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);
  const [taxProfile, setTaxProfile] = useState<any>(null);

  const businessId = currentBusinessId || businesses[0]?.id || null;
  const business = (businessId ? businesses.find((b) => b.id === businessId) : null) || businesses[0] || null;
  const year = new Date().getFullYear();
  const { pack, isLoading: packLoading, generate } = useFilingPack(businessId, year);
  const [packError, setPackError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const p = await getEligibilityResult(businessId, year);
      setTaxProfile(p);
    })().catch(() => setTaxProfile(null));
  }, [businessId, year]);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      try {
        const issues = await getReviewIssues(businessId, { taxYear: year, status: "open" });
        setOpenIssuesCount(issues.length);
      } catch {
        setOpenIssuesCount(0);
      }
    })().catch(() => {});
  }, [businessId, year]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // DEV assertion: this section should never render twice.
    const count = document.querySelectorAll("[data-section='recommended-actions']").length;
    if (count > 1) {
      // eslint-disable-next-line no-console
      console.warn(`[DEV] RecommendedActionsSection rendered ${count} times (expected 1)`);
    }
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <ErrorState
        title="Couldn’t load dashboard"
        message={error}
        onRetry={() => refresh()}
      />
    );
  }

  if (!businessId || !business) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-semibold text-rose-900">Couldn’t load workspace</p>
        <p className="mt-1 text-sm text-rose-700">No workspace found for this account.</p>
        <div className="mt-3 flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
          <Link className="text-sm text-emerald-700 hover:text-emerald-800" href="/onboarding">
            Set up workspace
          </Link>
        </div>
      </div>
    );
  }
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const profit = income - expenses;

  const latestAlerts = alerts.slice(0, 3);

  const hasEligibility = !!taxProfile;

  const fromOnboarding = searchParams.get("from") === "onboarding";
  const canGeneratePack = currentPlanId !== "free";

  const handleGeneratePack = async () => {
    setPackError(null);
    try {
      await generate();
    } catch (e: any) {
      setPackError(e?.message || "Failed to generate filing pack");
    }
  };

  return (
    <div className="space-y-4">
      {fromOnboarding && (
        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
          <span className="font-semibold">Nice one! </span>
          We&apos;ve used your answers to estimate your tax safety. Update your
          details any time from Settings.
        </div>
      )}

      {/* Tax Safety Hero */}
      <TaxSafetyCard />

      {businessId && (
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">Review issues</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {openIssuesCount > 0
                ? `You have ${openIssuesCount} open issue${openIssuesCount !== 1 ? "s" : ""} to review.`
                : "No open issues right now."}
            </div>
            <Link href="/app/review">
              <Button variant={openIssuesCount > 0 ? "primary" : "secondary"}>
                {openIssuesCount > 0 ? "Fix now" : "View"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Next Actions - Compliance Tasks */}
      {businessId && <ComplianceTasksCard businessId={businessId} />}

      {/* Top 3 Recommended Actions */}
      <RecommendedActionsSection />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand">
                Tax safety
              </p>
              <CardTitle className="mt-1 text-base">
                {hasEligibility
                  ? "Your latest eligibility result"
                  : "Run your 2‑minute tax status check"}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {hasEligibility ? (
                <span className="chip bg-slate-100 text-slate-700">UPDATED</span>
              ) : (
                <span className="chip bg-amber-50 text-amber-800">ACTION NEEDED</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasEligibility ? (
              <div className="grid gap-3 text-xs md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">CIT</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {taxProfile?.citStatus || "—"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Company income tax status.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">VAT</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {taxProfile?.vatStatus || "—"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">VAT registration status.</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[11px] text-slate-500">WHT</div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {taxProfile?.whtStatus || "—"}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Withholding tax status.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">You haven’t checked your tax status for this year.</p>
                <p className="mt-1 text-xs text-amber-800">
                  Run eligibility to confirm 0% status and populate your dashboard with accurate data.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-full bg-emerald-600 text-xs font-semibold hover:bg-emerald-700"
                    onClick={async () => {
                      if (!businessId) return;
                      try {
                        await runEligibilityCheck(businessId);
                        addToast({ title: "Status check complete", description: "Eligibility updated." });
                        const p = await getEligibilityResult(businessId, year);
                        setTaxProfile(p);
                      } catch (e: any) {
                        addToast({ title: "Couldn’t run status check", description: e?.message || "Please try again." });
                      }
                    }}
                  >
                    Run status check
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => router.push("/app/tax-safety")}>
                    View details
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total income</span>
              <span className="font-semibold text-emerald-700">
                ₦{income.toLocaleString("en-NG")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total expenses</span>
              <span className="font-semibold text-red-600">
                ₦{expenses.toLocaleString("en-NG")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Estimated profit</span>
              <span className="font-semibold">
                ₦{profit.toLocaleString("en-NG")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => router.push("/app/transactions/new?type=income")}>
                Add income
              </Button>
              <Button size="sm" variant="secondary" onClick={() => router.push("/app/transactions/new?type=expense")}>
                Add expense
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push("/app/transactions")}>
                View records
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              FIRS filing pack
            </p>
            <CardTitle className="text-base font-semibold text-slate-900">
              One-click FIRS filing pack
            </CardTitle>
            <p className="text-xs text-slate-600">
              Get a PDF + CSV pack to share with your accountant or FIRS.
            </p>
          </div>
          {!canGeneratePack && (
            <span className="rounded-full border border-dashed border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
              Basic plan and above
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          {pack ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">
                Last generated {new Date(pack.createdAt).toDateString()}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {pack.pdfUrl && (
                  <a
                    href={pack.pdfUrl}
                    className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800"
                  >
                    Download PDF
                  </a>
                )}
                {pack.csvUrl && (
                  <a
                    href={pack.csvUrl}
                    className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800"
                  >
                    Download CSV
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Create a ready-to-share pack (PDF + CSV) with your totals and checklist.
            </p>
          )}
          {packError && <p className="text-xs font-semibold text-rose-600">{packError}</p>}
          <div className="flex flex-wrap gap-2">
            {canGeneratePack ? (
              <Button
                className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                onClick={handleGeneratePack}
                disabled={packLoading}
              >
                {packLoading ? "Preparing..." : "Generate FIRS filing pack"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="rounded-full border-emerald-600 text-sm font-semibold text-emerald-700"
                onClick={() => (window.location.href = "/app/pricing")}
              >
                Upgrade to unlock
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* (intentionally rendered once) */}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Recent alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {latestAlerts.length === 0 && (
              <p className="text-slate-500">
                No alerts yet. Rorun will surface important deadlines and
                thresholds here.
              </p>
            )}
            {latestAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-[11px] font-semibold text-slate-800">
                    {alert.title}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {alert.message}
                  </p>
                </div>
                <span
                  className={`chip ${
                    alert.severity === "critical"
                      ? "bg-danger/10 text-danger"
                      : alert.severity === "warning"
                      ? "bg-warning/10 text-warning"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Year-end pack readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-slate-500">
              Once you have at least a few months of transactions, Rorun can
              generate a clean pack for your accountant or FIRS.
            </p>
            <Button size="sm" variant="secondary" className="w-full">
              Preview this year&apos;s summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
