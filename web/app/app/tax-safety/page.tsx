"use client";

import { useEffect, useMemo, useState } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { getTaxSafetyScore, TaxSafetyScore } from "@/lib/api/tax-safety";
import { runEligibilityCheck } from "@/lib/api/eligibility";
import { useToast } from "@/components/ui/toast";

const reasonCopy: Record<string, { title: string; body: string; action: string }> = {
  MISSING_ELIGIBILITY: {
    title: "You haven’t checked your tax status for this year",
    body: "Run a quick eligibility check so you’re sure you’re still on 0% and know what FIRS expects.",
    action: "Run eligibility check"
  },
  LOW_RECORDS_COVERAGE: {
    title: "Your records only cover a small part of the year",
    body: "FIRS expects your records to tell the story of your whole year, not just a few months.",
    action: "Add recent income and expenses"
  },
  MEDIUM_RECORDS_COVERAGE: {
    title: "Some months are still missing from your records",
    body: "You’re logging some activity, but a few months are still blank. Filling those gaps improves your safety.",
    action: "Fill in missing months"
  },
  LOW_RECEIPT_COVERAGE: {
    title: "Most of your big transactions don’t have receipts",
    body: "For high-value payments, receipts are your proof if FIRS asks questions. Uploading them reduces risk.",
    action: "Upload receipts for big amounts"
  },
  MEDIUM_RECEIPT_COVERAGE: {
    title: "Some receipts are missing for your bigger transactions",
    body: "You’ve attached receipts for some large payments but not all. Completing that trail keeps you safer.",
    action: "Add missing receipts"
  },
  OVERDUE_OBLIGATION: {
    title: "You have overdue filings",
    body: "Overdue returns are a fast way to get on FIRS’ radar. Clearing them should be your first priority.",
    action: "Review and file overdue returns"
  },
  DEADLINE_VERY_SOON: {
    title: "A filing deadline is just a few days away",
    body: "Preparing your figures now means you can file on time without last-minute panic.",
    action: "Prepare this filing now"
  },
  DEADLINE_SOON: {
    title: "A filing deadline is coming up",
    body: "Starting early keeps you calm and gives you time to ask questions if something looks off.",
    action: "Plan ahead for this filing"
  },
  MISSING_FILING_PACK: {
    title: "You haven’t generated your filing pack yet",
    body: "A year-end pack (PDF + CSV) makes it easy to share clean totals with your accountant or respond quickly if FIRS asks questions.",
    action: "Generate filing pack"
  }
};

export default function TaxSafetyDetailPage() {
  const router = useRouter();
  const { businesses } = useMockApi();
  const { addToast } = useToast();
  const business = businesses[0];
  const year = new Date().getFullYear();
  const [score, setScore] = useState<TaxSafetyScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getTaxSafetyScore(business.id, year);
        if (!cancelled) setScore(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Couldn’t load tax safety score.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [business?.id, year]);

  if (!business) {
    return <div className="text-sm text-slate-500">Loading tax safety details…</div>;
  }
  if (loading && !score) {
    return <div className="text-sm text-slate-500">Loading tax safety details…</div>;
  }
  if (!score) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <p className="text-sm font-semibold text-rose-900">Couldn’t load tax safety</p>
        <p className="mt-1 text-sm text-rose-700">{error || "Please try again."}</p>
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const bandSummary =
    score.band === "high"
      ? "You’re in a strong FIRS-ready position."
      : score.band === "medium"
      ? "You’re mostly safe but there are gaps to fix."
      : "High risk if FIRS asks questions today.";

  const handleReasonAction = async (reason: string) => {
    if (reason === "MISSING_ELIGIBILITY") {
      try {
        await runEligibilityCheck(business.id);
        addToast({ title: "Status check complete", description: "Your eligibility has been updated." });
        const updated = await getTaxSafetyScore(business.id, year);
        setScore(updated);
      } catch (e: any) {
        addToast({ title: "Couldn’t run status check", description: e?.message || "Please try again." });
      }
      return;
    }
    if (reason === "LOW_RECORDS_COVERAGE" || reason === "MEDIUM_RECORDS_COVERAGE") {
      router.push("/app/transactions/new");
      return;
    }
    if (reason === "LOW_RECEIPT_COVERAGE" || reason === "MEDIUM_RECEIPT_COVERAGE") {
      router.push("/app/documents");
      return;
    }
    if (reason === "OVERDUE_OBLIGATION") {
      router.push("/app/obligations?filter=overdue");
      return;
    }
    if (reason === "MISSING_FILING_PACK") {
      router.push("/app/summary");
      return;
    }
    router.push("/app/dashboard");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              FIRS-Ready Status
            </p>
            <CardTitle className="mt-1 flex items-baseline gap-3 text-base">
              <span className="text-4xl font-semibold">
                {Math.round(score.score)}
              </span>
              <span className="text-sm text-slate-500">/ 100</span>
            </CardTitle>
            <p className="mt-2 text-xs text-slate-600">{bandSummary}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Based on your tax status, how complete your records are, big-payment receipts, and deadlines.
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-xs md:grid-cols-3">
          <div className="space-y-1">
            <div className="font-semibold text-slate-700">
              Records coverage
            </div>
            <p className="text-slate-600">
              You’ve logged activity in{" "}
              <span className="font-semibold">
                {Math.round(score.breakdown.recordsCoverageRatio * 100)}%
              </span>{" "}
              of months so far this year.
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-700">
              Receipts for big amounts
            </div>
            {score.breakdown.receiptCoverageRatio === null ? (
              <p className="text-slate-600">
                We’ll start checking this once you have at least a few
                high-value transactions (₦50k+).
              </p>
            ) : (
              <p className="text-slate-600">
                About{" "}
                <span className="font-semibold">
                  {Math.round(
                    (score.breakdown.receiptCoverageRatio ?? 0) * 100
                  )}
                  %
                </span>{" "}
                of your high-value transactions have receipts attached.
              </p>
            )}
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-slate-700">Deadlines</div>
            {score.breakdown.daysUntilNextDeadline == null ? (
              <p className="text-slate-600">
                No deadlines captured yet. Once obligations are set up, we’ll
                factor them in here.
              </p>
            ) : score.breakdown.daysUntilNextDeadline < 0 ? (
              <p className="text-slate-600">
                You have overdue filings. Fixing these quickly will sharply
                improve your score.
              </p>
            ) : (
              <p className="text-slate-600">
                Your next filing is in{" "}
                <span className="font-semibold">
                  {score.breakdown.daysUntilNextDeadline} days
                </span>
                . Preparing early keeps you safe.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {score.scoreBreakdownV2 ? (
        <details className="rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            How your score is calculated
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {score.scoreBreakdownV2.components.map((c) => (
              <div key={c.key} className="rounded-md bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-700">{c.label}</span>
                  <span className="text-slate-600">
                    {Math.round(c.points)}/{Math.round(c.maxPoints)}
                  </span>
                </div>
                {c.description ? (
                  <p className="mt-1 text-[11px] text-slate-500">{c.description}</p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-800">Ways to increase your score</p>
            <div className="mt-2 space-y-2 text-xs">
              {score.scoreBreakdownV2.components
                .filter((c) => c.howToImprove)
                .slice(0, 6)
                .map((c) => (
                  <div key={c.key} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800">{c.label}</p>
                      <span className="text-slate-600">
                        {Math.round(c.points)}/{Math.round(c.maxPoints)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{c.howToImprove}</p>
                    {c.href ? (
                      <div className="mt-2">
                        <Button size="sm" variant="secondary" onClick={() => router.push(c.href!)}>
                          Open
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        </details>
      ) : score.breakdownPoints ? (
        // Back-compat fallback (older server versions)
        <details className="rounded-lg border border-slate-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-900">
            How your score is calculated
          </summary>
          <div className="mt-3 space-y-2 text-xs">
            {([
              ["Tax profile", score.breakdownPoints.taxProfile],
              ["Records coverage", score.breakdownPoints.recordsCoverage],
              ["Receipts", score.breakdownPoints.receipts],
              ["Deadlines", score.breakdownPoints.deadlines],
              ["Overdue", score.breakdownPoints.overdue],
              ["Filing pack", score.breakdownPoints.filingPack],
            ] as Array<[string, { earned: number; max: number }]>).map(([label, p]) => (
              <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span className="font-semibold text-slate-700">{label}</span>
                <span className="text-slate-600">
                  {Math.round(p.earned)}/{Math.round(p.max)}
                </span>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to improve your FIRS-Ready status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {score.reasons.length === 0 ? (
            <p className="text-slate-600">
              You&apos;re in a good place. Keep logging income and expenses
              monthly, attach receipts for bigger payments, and file on time to
              maintain this score.
            </p>
          ) : (
            score.reasons.map((reason) => {
              const copy = reasonCopy[reason];
              if (!copy) return null;
              return (
                <div
                  key={reason}
                  className="flex items-start justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="pr-4">
                    <div className="text-[11px] font-semibold text-slate-800">
                      {copy.title}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600">
                      {copy.body}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleReasonAction(reason)}>
                    {copy.action}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}


