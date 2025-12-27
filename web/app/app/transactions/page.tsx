"use client";

import { Suspense, useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImportWizard } from "@/components/import-wizard";
import { MonoConnectButton } from "@/components/bank/MonoConnectButton";
import { BankConnectionsPanel } from "@/components/bank/BankConnectionsPanel";
import { getTransactions, Transaction } from "@/lib/api/transactions";
import { useToast } from "@/components/ui/toast";
import { Upload } from "lucide-react";
import { getBusinesses } from "@/lib/api/businesses";
import { ErrorState, useSlowLoading } from "@/components/ui/page-state";
import { useMockApi as useMockData } from "@/lib/mock-api";
import { useMockApi } from "@/lib/mock-api";
import { RequireAccess } from "@/components/RequireAccess";
import { canAccess } from "@/lib/entitlements";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <TransactionsPageInner />
    </Suspense>
  );
}

function TransactionsPageInner() {
  const searchParams = useSearchParams();
  const focus = searchParams.get("focus");
  const openImport = searchParams.get("import") === "true";
  const { addToast } = useToast();
  const { businesses: mockBusinesses } = useMockData();
  
  const [business, setBusiness] = useState<{ id: string } | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentPlanId } = useMockApi();
  const slow = useSlowLoading(loading);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true" && mockBusinesses?.[0]?.id) {
      setBusiness({ id: mockBusinesses[0].id });
      return;
    }
    loadBusiness();
  }, []);

  useEffect(() => {
    if (openImport) {
      setShowImportWizard(true);
    }
  }, [openImport]);

  useEffect(() => {
    if (business?.id) {
      loadTransactions();
    }
  }, [business?.id, refreshKey]);

  const loadBusiness = async () => {
    try {
      setBusinessError(null);
      const businesses = await getBusinesses();
      if (businesses && businesses.length > 0) {
        setBusiness({ id: businesses[0].id });
      } else {
        setBusiness(null);
        setBusinessError("No workspace found for this account.");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Failed to load business:", error);
      setBusinessError(error?.message || "Couldn't load your workspace.");
      setBusiness(null);
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!business?.id) return;
    
    try {
      setLoading(true);
      setLoadError(null);
      const result = await getTransactions(business.id, {
        limit: 1000,
      });
      setTransactions(result.items || []);
    } catch (error: any) {
      setLoadError(error?.message || "Please try again later.");
      addToast({
        title: "Failed to load transactions",
        description: error?.message || "Please try again later.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(() => {
    const byMonth: Record<string, Transaction[]> = {};
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(tx);
    });
    return Object.entries(byMonth).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const monthsWithTransactions = useMemo(() => {
    const set = new Set<number>();
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      if (d.getFullYear() === currentYear) {
        set.add(d.getMonth());
      }
    });
    return set;
  }, [transactions, currentYear]);

  const missingMonths = useMemo(() => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const missing: string[] = [];
    for (let m = 0; m <= currentMonth; m++) {
      if (!monthsWithTransactions.has(m)) {
        missing.push(monthNames[m]);
      }
    }
    return missing;
  }, [monthsWithTransactions, currentMonth]);

  if (!business) {
    return (
      <div className="space-y-4">
        {businessError ? (
          <ErrorState
            title="Couldn’t load workspace"
            message={businessError}
            onRetry={() => loadBusiness()}
          />
        ) : (
          <Card className="bg-white">
            <CardContent className="py-6">
              <p className="text-sm text-slate-500">
                {slow ? "Still loading… Check your API connection and retry." : "Loading…"}
              </p>
              {slow && (
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onClick={() => loadBusiness()}>
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <ErrorState
          title="Couldn’t load transactions"
          message={loadError}
          onRetry={() => loadTransactions()}
        />
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">Recent income and expenses by month.</p>
        </div>
        <div className="flex items-center gap-2">
        <Button
          onClick={() => setShowImportWizard(true)}
          className="rounded-full bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
        >
          <Upload className="mr-1.5 h-4 w-4" />
            Upload statement
          </Button>
          <RequireAccess
            planId={currentPlanId}
            feature="bank_connect"
            lockedCopy={{
              title: "Connect bank",
              description: "Bank sync requires Business plan or higher.",
              cta: "Upgrade",
            }}
          >
            <MonoConnectButton
              businessId={business.id}
              onSuccess={() => {
                setRefreshKey((k) => k + 1);
              }}
            />
          </RequireAccess>
        </div>
      </div>

      {/* Bank Import Card */}
      <Card className="bg-white border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Bank Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900 mb-1">
                Upload bank statement
              </p>
              <p className="text-xs text-slate-500">
                Upload a PDF or CSV statement to import transactions. Available for all plans.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowImportWizard(true)}
              className="rounded-full bg-emerald-600 text-xs font-semibold hover:bg-emerald-700"
            >
              <Upload className="mr-1.5 h-3 w-3" />
              Upload
            </Button>
          </div>
          
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 mb-1">Connect your bank</p>
                <p className="text-xs text-slate-500">
                  Automatically sync transactions from your bank account. Available for Business and Accountant plans.
                </p>
              </div>
              <RequireAccess planId={currentPlanId} feature="bank_connect">
                <MonoConnectButton
                  businessId={business.id}
                  onSuccess={() => {
                    setRefreshKey((k) => k + 1);
                  }}
                />
              </RequireAccess>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Connections Panel */}
      {canAccess(currentPlanId, "bank_connect") && <BankConnectionsPanel businessId={business.id} />}

      {showImportWizard && (
        <ImportWizard
          businessId={business.id}
          onClose={() => setShowImportWizard(false)}
          onSuccess={() => {
            setShowImportWizard(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {focus === "missing-months" && missingMonths.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  Missing months detected
                </p>
                <p className="text-xs text-amber-700">
                  No transactions recorded for {missingMonths.slice(0, 3).join(", ")}
                  {missingMonths.length > 3 && ` and ${missingMonths.length - 3} more`}.
                </p>
              </div>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700"
                onClick={() => {
                  window.location.href = "/app/transactions/new";
                }}
              >
                Add records
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="bg-white">
          <CardContent className="py-6">
            <p className="text-sm text-slate-500">Loading transactions...</p>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="bg-white">
          <CardContent className="py-6">
            <p className="text-sm text-slate-500">
              No transactions yet. Add income or expense records to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        grouped.map(([month, list]) => (
          <Card key={month} className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800">
                {month}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tx.description || "Transaction"}</p>
                    <p className="text-xs text-slate-500">
                      {tx.type === "income" ? "Income" : "Expense"} • {new Date(tx.date).toDateString()}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {tx.type === "income" ? "+" : "-"}₦{Number(tx.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
