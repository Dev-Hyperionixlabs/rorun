"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMockApi } from "@/lib/mock-api";
import { FilingPackCard } from "@/components/filing-pack-card";
import { getBusinesses } from "@/lib/api/businesses";
import { useFeatures } from "@/hooks/use-features";
import { FileText, Lock } from "lucide-react";
import Link from "next/link";

export default function SummaryPage() {
  const { yearSummaries, businesses, loading } = useMockApi();
  const summary = yearSummaries[0];
  const business = businesses[0];
  const year = new Date().getFullYear();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const { hasFeature } = useFeatures(businessId);

  useEffect(() => {
    loadBusiness();
  }, []);

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

      {businessId && (
        <>
          {hasFeature("yearEndFilingPack") ? (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      Guided filing wizard
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Step-by-step interview to prepare your annual return
                    </p>
                  </div>
                  <Link href={`/app/filing-wizard/${year}/annual`}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                      <FileText className="mr-2 h-4 w-4" />
                      Start guided filing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                  <Lock className="h-4 w-4 text-amber-700" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">
                      Guided filing wizard
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Requires Basic plan or higher
                    </p>
                  </div>
                  <Link href="/app/pricing">
                    <Button variant="secondary" size="sm" className="text-xs">
                      Upgrade
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
          <FilingPackCard businessId={businessId} taxYear={year} />
        </>
      )}
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

