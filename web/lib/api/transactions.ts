"use client";

import { api } from "./client";
import { Transaction } from "../types";

export type { Transaction };

export interface CreateTransactionInput {
  businessId: string;
  type: "income" | "expense";
  amount: number;
  description?: string;
  category?: string;
  date: string;
  paymentMethod?: string;
}

export async function getTransactions(businessId: string, params?: {
  year?: number;
  type?: "income" | "expense";
  limit?: number;
  offset?: number;
}): Promise<{ items: Transaction[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.year) searchParams.set("year", String(params.year));
  if (params?.type) searchParams.set("type", params.type);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const query = searchParams.toString();
  const endpoint = `/businesses/${businessId}/transactions${query ? `?${query}` : ""}`;
  
  return api.get(endpoint);
}

export async function createTransaction(data: CreateTransactionInput): Promise<Transaction> {
  return api.post(`/businesses/${data.businessId}/transactions`, data);
}

export async function updateTransaction(
  businessId: string,
  txId: string,
  data: Partial<CreateTransactionInput>
): Promise<Transaction> {
  return api.patch(`/businesses/${businessId}/transactions/${txId}`, data);
}

export async function deleteTransaction(businessId: string, txId: string): Promise<void> {
  return api.delete(`/businesses/${businessId}/transactions/${txId}`);
}

