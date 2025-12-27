"use client";

import { useEffect, useState, useRef } from "react";
import {
  getFilingPackStatus,
  generateFilingPack,
  FilingPack,
} from "@/lib/api/filingPacks";

export function useFilingPack(businessId: string | null, year: number) {
  const [pack, setPack] = useState<FilingPack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef<boolean>(false);

  const stopPolling = () => {
    isPollingRef.current = false;
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const startPolling = () => {
    if (!businessId) return;
    if (isPollingRef.current) return; // Already polling
    stopPolling();
    isPollingRef.current = true;

    let pollCount = 0;
    const maxQuickPolls = 30; // 60 seconds at 2s intervals
    let currentInterval = 2000; // Start with 2 seconds

    const poll = async () => {
      if (!isPollingRef.current) return;

      try {
        const result = await getFilingPackStatus(businessId, year);
        if (result.pack) {
          setPack(result.pack);

          // Stop polling if ready or failed
          if (result.pack.status === "ready" || result.pack.status === "failed") {
            stopPolling();
            setIsGenerating(false);
            return;
          }
        }

        pollCount++;
        if (pollCount >= maxQuickPolls && currentInterval === 2000) {
          // After 60 seconds, slow down to 5 seconds
          stopPolling();
          currentInterval = 5000;
          pollingIntervalRef.current = setInterval(poll, currentInterval);
        }
      } catch (e: any) {
        console.error("Polling error:", e);
        // Continue polling on error
      }
    };

    // Initial poll
    poll();

    // Set up interval
    pollingIntervalRef.current = setInterval(poll, currentInterval);

    // Set timeout to stop after reasonable time (5 minutes)
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setIsGenerating(false);
    }, 5 * 60 * 1000);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!businessId) {
        setPack(null);
        setIsGenerating(false);
        setIsLoading(false);
        setError("No workspace selected.");
        stopPolling();
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const result = await getFilingPackStatus(businessId, year);
        if (!cancelled && result.pack) {
          setPack(result.pack);
          // Start polling if pack is queued or generating
          if (result.pack.status === "queued" || result.pack.status === "generating") {
            setIsGenerating(true);
            startPolling();
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load filing pack");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [businessId, year]);

  const generate = async () => {
    if (!businessId) {
      const err: any = new Error("No workspace selected");
      err.code = "NO_WORKSPACE";
      throw err;
    }
    setIsLoading(true);
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateFilingPack(businessId, year);
      // Start polling immediately
      startPolling();
      // Load the pack
      const statusResult = await getFilingPackStatus(businessId, year);
      if (statusResult.pack) {
        setPack(statusResult.pack);
      }
      return result;
    } catch (e: any) {
      setIsGenerating(false);
      const errorMessage = e?.data?.message || e?.message || "Failed to generate filing pack";
      setError(errorMessage);
      
      // Check if it's a plan upgrade error
      if (e?.code === "PLAN_UPGRADE_REQUIRED" || e?.data?.code === "PLAN_UPGRADE_REQUIRED") {
        setError("Filing pack generation requires Basic plan or higher. Please upgrade.");
      }
      
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { pack, isLoading, isGenerating, error, generate };
}

