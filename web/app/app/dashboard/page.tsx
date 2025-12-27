"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaxSafetyCard } from "@/components/tax-safety-card";
import { RecommendedActionsSection } from "@/components/recommended-actions";
import { ComplianceTasksCard } from "@/components/compliance-tasks-card";
import { useFilingPack } from "@/hooks/use-filing-pack";
import { getBusinesses } from "@/lib/api/businesses";
import { getReviewIssues } from "@/lib/api/review";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { businesses, transactions, alerts, currentPlanId } = useMockApi();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [openIssuesCount, setOpenIssuesCount] = useState<number>(0);

  const business = businesses[0];
  const year = new Date().getFullYear();
  // Hooks must be called unconditionally - use fallback ID if business is null
  const { pack, isLoading: packLoading, generate } = useFilingPack(
    business?.id || businessId || "",
    year
  );
  const [packError, setPackError] = useState<string | null>(null);

  const loadBusiness = async () => {
    try {
      const businesses = await getBusinesses();
      if (businesses && businesses.length > 0) {
        setBusinessId(businesses[0].id);
        try {
          const year = new Date().getFullYear();
          const issues = await getReviewIssues(businesses[0].id, { taxYear: year, status: "open" });
          setOpenIssuesCount(issues.length);
        } catch {
          setOpenIssuesCount(0);
        }
      }
    } catch (error: any) {
      console.error("Failed to load business:", error);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // DEV assertion: this section should never render twice.
    const count = document.querySelectorAll("[data-section='recommended-actions']").length;
    if (count > 1) {
      // eslint-disable-next-line no-console
      console.warn(`[DEV] RecommendedActionsSection rendered ${count} times (expected 1)`);
    }
  }, []);

  if (!business) {
    return <div className="text-sm text-slate-500">Loading dashboard…</div>;
  }
  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const profit = income - expenses;

  const latestAlerts = alerts.slice(0, 3);

  const eligibility = business.eligibility || {
    citStatus: "exempt",
    vatStatus: "not_required",
    whtSummary:
      "You may need to deal with WHT when big clients pay you. Rorun will flag common cases.",
    headline: "You likely qualify for 0% company income tax.",
    explanation: [
      "Based on your turnover band you are treated as a micro/small company.",
      "You still need to file at least once a year even if tax is 0%.",
      "Keep simple records so you can respond to FIRS without panic."
    ],
    riskLevel: "safe",
    year: new Date().getFullYear()
  };

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
                {eligibility.headline}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="chip bg-emerald-100 text-emerald-800">
                {eligibility.riskLevel === "safe"
                  ? "SAFE"
                  : eligibility.riskLevel === "attention"
                  ? "ATTENTION"
                  : "RISK"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-xs md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">CIT</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {eligibility.citStatus === "exempt"
                    ? "0% – exempt"
                    : eligibility.citStatus === "liable"
                    ? "May be liable"
                    : "Unknown"}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Company income tax based on your turnover band.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">VAT</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {eligibility.vatStatus === "not_required"
                    ? "Not required to register (yet)"
                    : eligibility.vatStatus === "registered"
                    ? "Registered"
                    : "Should register soon"}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  We&apos;ll warn you if your turnover suggests VAT registration.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-[11px] text-slate-500">Next deadline</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  Annual return • 45 days left
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Rorun will remind you before this date and generate a pack.
                </p>
              </div>
            </div>

            <ul className="space-y-1 text-xs text-slate-600">
              {eligibility.explanation.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
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
              <Button size="sm">Add income</Button>
              <Button size="sm" variant="secondary">
                Add expense
              </Button>
              <Button size="sm" variant="ghost">
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
