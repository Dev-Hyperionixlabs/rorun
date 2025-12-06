"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMockApi } from "@/lib/mock-api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { useFirsReady } from "@/hooks/use-firs-ready";
import { useToast } from "./ui/toast";

export function TaxSafetyCard() {
  const { businesses, transactions } = useMockApi();
  const business = businesses[0];
  const year = new Date().getFullYear();

  const { status } = useFirsReady(business, transactions, year);
  const prevScore = useRef<number | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (status && prevScore.current !== null && prevScore.current !== status.score) {
      const diff = status.score - prevScore.current;
      if (Math.abs(diff) >= 2) {
        if (diff > 0) {
          addToast({
            title: "You’re more FIRS-ready",
            description: `Score improved from ${prevScore.current} to ${status.score}.`,
          });
        } else {
          addToast({
            title: "FIRS-Ready score dropped",
            description: `Score moved from ${prevScore.current} to ${status.score}.`,
          });
        }
      }
    }
    if (status) prevScore.current = status.score;
  }, [status, addToast]);

  if (!status) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-slate-600">
          Loading FIRS-Ready status...
        </CardContent>
      </Card>
    );
  }

  const bandLabel =
    status.band === "high"
      ? "FIRS-Ready: Green – You’re in a strong position."
      : status.band === "medium"
      ? "FIRS-Ready: Amber – A few gaps to fix."
      : "FIRS-Ready: Red – High risk if FIRS asks today.";

  const bandColor =
    status.band === "high"
      ? "bg-emerald-50 text-emerald-800"
      : status.band === "medium"
      ? "bg-amber-50 text-amber-800"
      : "bg-red-50 text-red-800";

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            FIRS-Ready Status
          </p>
          <CardTitle className="flex items-baseline gap-3 text-base">
            <span className="text-3xl font-semibold">
              {Math.round(status.score)}
            </span>
            <span className="text-sm text-slate-500">/ 100</span>
          </CardTitle>
          <p className="text-xs text-slate-600">{bandLabel}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            How safe you are if FIRS asks questions today.
          </p>
        </div>
        <div
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${bandColor}`}
        >
          {status.band.toUpperCase()}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4 text-xs">
        <div className="space-y-1 text-slate-600 text-xs">
          <p>{status.message}</p>
        </div>
        <Link href="/app/tax-safety">
          <Button size="sm" variant="secondary">
            View details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}


