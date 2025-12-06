"use client";

import { useEffect, useState } from "react";
import { createFilingPack, getLatestFilingPack } from "@/lib/api/filingPacks";
import { FilingPack } from "@/lib/types";

export function useFilingPack(businessId: string, year: number) {
  const [pack, setPack] = useState<FilingPack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const latest = await getLatestFilingPack(businessId, year);
        if (!cancelled && latest) setPack(latest);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load filing pack");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [businessId, year]);

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const created = await createFilingPack(businessId, year);
      setPack(created);
      return created;
    } catch (e: any) {
      setError(e?.message || "Failed to create filing pack");
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { pack, isLoading, error, generate };
}

