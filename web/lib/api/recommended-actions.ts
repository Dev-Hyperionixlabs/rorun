import { RecommendedAction } from "../types";
import { api } from "./client";

export async function fetchRecommendedActions(
  businessId: string,
  year: number
): Promise<RecommendedAction[] | null> {
  try {
    const data = await api.get<{ items: RecommendedAction[] }>(
      `/businesses/${businessId}/recommended-actions?year=${year}`
    );
    return data?.items ?? [];
  } catch {
    return null;
  }
}

export async function completeAction(
  businessId: string,
  actionType: string,
  year: number,
  meta?: any
): Promise<void> {
  await api.post(
    `/businesses/${businessId}/recommended-actions/actions/${actionType}/complete?year=${year}`,
    { meta }
  );
}

export async function dismissAction(
  businessId: string,
  actionType: string,
  year: number
): Promise<void> {
  await api.post(
    `/businesses/${businessId}/recommended-actions/actions/${actionType}/dismiss?year=${year}`
  );
}

