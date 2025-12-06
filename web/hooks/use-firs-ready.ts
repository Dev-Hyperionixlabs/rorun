"use client";

import { useEffect, useState } from "react";
import { getFirsReadyStatus } from "@/lib/api/firsReady";
import { FirsReadyStatus, Business, Transaction } from "@/lib/types";
import { computeTaxSafetyScoreFromMock } from "@/lib/tax-safety";

export function useFirsReady(
  business: Business | null,
  transactions: Transaction[],
  year: number
) {
  const [status, setStatus] = useState<FirsReadyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business) return;
      setIsLoading(true);
      try {
        const apiStatus = await getFirsReadyStatus(business.id, year);
        if (!cancelled && apiStatus) {
          setStatus(apiStatus);
          return;
        }
      } catch {
        // ignore and fall back
      }

      // fallback to mock computation
      const score = computeTaxSafetyScoreFromMock(business, transactions, year);
      if (!cancelled) {
        setStatus({
          businessId: business.id,
          taxYear: year,
          score: score.score,
          band: score.band,
          label:
            score.score >= 80
              ? "Green"
              : score.score >= 50
              ? "Amber"
              : "Red",
          message:
            score.score >= 80
              ? "You’re in a strong FIRS-ready position."
              : score.score >= 50
              ? "Mostly safe, but there are gaps to fix."
              : "High risk if FIRS asks questions today.",
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [business, transactions, year]);

  return { status, isLoading };
}

