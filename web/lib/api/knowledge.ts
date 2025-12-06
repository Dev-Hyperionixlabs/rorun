"use client";

import { api } from "./client";
import { KnowledgeArticle } from "../types";

export async function getKnowledgeArticles(params?: {
  language?: "en" | "pidgin";
  tag?: string;
}): Promise<KnowledgeArticle[]> {
  const searchParams = new URLSearchParams();
  if (params?.language) searchParams.set("language", params.language);
  if (params?.tag) searchParams.set("tag", params.tag);

  const query = searchParams.toString();
  const endpoint = `/knowledge${query ? `?${query}` : ""}`;
  
  const response = await api.get<{ items: KnowledgeArticle[] }>(endpoint);
  return response.items || [];
}

export async function getKnowledgeArticle(slug: string): Promise<KnowledgeArticle | null> {
  try {
    return await api.get(`/knowledge/${slug}`);
  } catch {
    return null;
  }
}

