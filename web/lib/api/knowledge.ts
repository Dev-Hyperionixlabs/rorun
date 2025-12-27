"use client";

import { api } from "./client";
import { KnowledgeArticle } from "../types";

export async function getKnowledgeArticles(params?: {
  language?: "en" | "pidgin";
  tag?: string;
}): Promise<KnowledgeArticle[]> {
  const searchParams = new URLSearchParams();
  if (params?.language) searchParams.set("language", params.language);
  // Server expects `tags` (comma-separated). Keep `tag` in the client API for convenience.
  if (params?.tag) searchParams.set("tags", params.tag);

  const query = searchParams.toString();
  const endpoint = `/knowledge/articles${query ? `?${query}` : ""}`;

  // Backend returns an array; older clients expected `{ items }`.
  const response = await api.get<any>(endpoint);
  if (Array.isArray(response)) return response as KnowledgeArticle[];
  return (response?.items as KnowledgeArticle[]) || [];
}

export async function getKnowledgeArticle(slug: string): Promise<KnowledgeArticle | null> {
  try {
    return await api.get(`/knowledge/articles/${slug}`);
  } catch {
    return null;
  }
}

