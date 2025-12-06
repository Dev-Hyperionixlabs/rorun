"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockApi } from "@/lib/mock-api";
import { useFilingPack } from "@/hooks/use-filing-pack";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function SummaryPage() {
  const { yearSummaries, businesses } = useMockApi();
  const summary = yearSummaries[0];
  const business = businesses[0];
  const year = new Date().getFullYear();
  const { pack, isLoading, error, generate } = useFilingPack(business.id, year);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Year-end summary</h1>
        <p className="text-sm text-slate-500">
          At-a-glance figures for your filings and exports.
        </p>
      </div>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            {summary.year} • {business.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Stat label="Total income" value={`₦${summary.totalIncome.toLocaleString()}`} />
          <Stat label="Total expenses" value={`₦${summary.totalExpenses.toLocaleString()}`} />
          <Stat label="Profit" value={`₦${summary.profit.toLocaleString()}`} />
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Filing pack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {pack ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">Year {pack.taxYear}</p>
                <p className="text-xs text-slate-500">
                  Generated {new Date(pack.createdAt).toDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pack.pdfUrl && (
                  <a
                    href={pack.pdfUrl}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    PDF
                  </a>
                )}
                {pack.csvUrl && (
                  <a
                    href={pack.csvUrl}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                  >
                    CSV
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                No packs generated yet. Create one for {year} to share with your accountant.
              </p>
              <div className="flex gap-2">
                <Button
                  className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
                  onClick={async () => {
                    setLocalError(null);
                    try {
                      await generate();
                    } catch (e: any) {
                      setLocalError(e?.message || "Failed to generate pack");
                    }
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Preparing..." : "Generate FIRS filing pack"}
                </Button>
              </div>
              {(error || localError) && (
                <p className="text-xs font-semibold text-rose-600">{error || localError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

