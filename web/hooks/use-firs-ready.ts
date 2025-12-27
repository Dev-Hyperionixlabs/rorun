"use client";

import { useEffect, useState } from "react";
import { getFirsReadyStatus } from "@/lib/api/tax-safety";
import { FirsReadyStatus, Business, Transaction } from "@/lib/types";

export function useFirsReady(
  business: Business | null,
  transactions: Transaction[],
  year: number
) {
  const [status, setStatus] = useState<FirsReadyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!business) return;
      setIsLoading(true);
      setError(null);
      try {
        const apiStatus = await getFirsReadyStatus(business.id, year);
        if (!cancelled) setStatus(apiStatus);
      } catch (e: any) {
        if (!cancelled) {
          setStatus(null);
          setError(e?.message || "Couldn’t load FIRS-ready status.");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [business, transactions, year]);

  return { status, isLoading, error };
}

