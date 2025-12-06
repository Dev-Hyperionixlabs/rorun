"use client";

import { useMemo } from "react";
import { useMockApi } from "@/lib/mock-api";
import { computeTaxSafetyScoreFromMock } from "@/lib/tax-safety";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
  }
};

export default function TaxSafetyDetailPage() {
  const { businesses, transactions } = useMockApi();
  const business = businesses[0];
  const year = new Date().getFullYear();

  const score = useMemo(
    () => computeTaxSafetyScoreFromMock(business, transactions, year),
    [business, transactions, year]
  );

  const bandSummary =
    score.band === "high"
      ? "You’re in a strong FIRS-ready position."
      : score.band === "medium"
      ? "You’re mostly safe but there are gaps to fix."
      : "High risk if FIRS asks questions today.";

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
                  <Button size="sm" variant="secondary">
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


