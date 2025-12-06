"use client";

import { useMemo } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TransactionsPage() {
  const { transactions } = useMockApi();

  const grouped = useMemo(() => {
    const byMonth: Record<string, typeof transactions> = {};
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(tx);
    });
    return Object.entries(byMonth).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Transactions</h1>
        <p className="text-sm text-slate-500">Recent income and expenses by month.</p>
      </div>

      {grouped.length === 0 ? (
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
                    <p className="text-sm font-medium text-slate-900">{tx.description}</p>
                    <p className="text-xs text-slate-500">
                      {tx.type === "income" ? "Income" : "Expense"} • {new Date(tx.date).toDateString()}
                    </p>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
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

