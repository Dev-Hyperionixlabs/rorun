"use client";

import { useEffect, useState } from "react";
import { fetchRecommendedActions } from "@/lib/api/recommended-actions";
import { RecommendedAction } from "@/lib/types";

interface UseRecommendedActionsResult {
  actions: RecommendedAction[] | null;
  isLoading: boolean;
  isError: boolean;
  usedApi: boolean;
  refresh: () => Promise<void>;
}

export function useRecommendedActionsApi(
  businessId: string,
  year: number
): UseRecommendedActionsResult {
  const [actions, setActions] = useState<RecommendedAction[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [usedApi, setUsedApi] = useState<boolean>(false);

  const loadActions = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await fetchRecommendedActions(businessId, year);
      if (data) {
        setActions(data);
        setUsedApi(true);
      }
    } catch (e) {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [businessId, year]);

  return { actions, isLoading, isError, usedApi, refresh: loadActions };
}

