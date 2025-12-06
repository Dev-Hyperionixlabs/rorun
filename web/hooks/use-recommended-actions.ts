"use client";

import { useEffect, useState } from "react";
import { fetchRecommendedActions } from "@/lib/api/recommended-actions";
import { RecommendedAction } from "@/lib/types";

interface UseRecommendedActionsResult {
  actions: RecommendedAction[] | null;
  isLoading: boolean;
  isError: boolean;
  usedApi: boolean;
}

export function useRecommendedActionsApi(
  businessId: string,
  year: number
): UseRecommendedActionsResult {
  const [actions, setActions] = useState<RecommendedAction[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [usedApi, setUsedApi] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setIsError(false);
      try {
        const data = await fetchRecommendedActions(businessId, year);
        if (cancelled) return;
        if (data) {
          setActions(data);
          setUsedApi(true);
        }
      } catch (e) {
        if (!cancelled) {
          setIsError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [businessId, year]);

  return { actions, isLoading, isError, usedApi };
}

