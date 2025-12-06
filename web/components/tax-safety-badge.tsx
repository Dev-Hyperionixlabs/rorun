"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMockApi } from "@/lib/mock-api";
import { useFirsReady } from "@/hooks/use-firs-ready";

export function TaxSafetyBadge() {
  const { businesses, transactions } = useMockApi();
  const business = businesses[0];
  const year = new Date().getFullYear();

  const { status } = useFirsReady(business, transactions, year);
  const score = status?.score ?? 0;
  const band = status?.band ?? "medium";

  const bandColor =
    band === "high"
      ? "bg-emerald-100 text-emerald-800"
      : band === "medium"
      ? "bg-amber-100 text-amber-800"
      : "bg-red-100 text-red-800";

  const dotColor =
    band === "high"
      ? "bg-emerald-500"
      : band === "medium"
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <Link
      href="/app/tax-safety"
      className={`hidden md:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${bandColor}`}
      title="View FIRS-Ready details"
    >
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span>FIRS {Math.round(score)}</span>
    </Link>
  );
}


