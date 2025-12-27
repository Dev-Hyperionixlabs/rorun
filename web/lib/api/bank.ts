"use client";

import { api as http } from "./client";

export interface BankConnection {
  id: string;
  businessId: string;
  provider: string;
  status: "active" | "error" | "disconnected";
  providerAccountId: string;
  institutionName: string | null;
  accountName: string | null;
  accountNumberMasked: string | null;
  currency: string;
  lastSyncedAt: string | null;
  lastSyncCursor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MonoInitResponse {
  publicKey: string;
  environment: string;
  consentText: string;
  consentTextVersion: string;
}

export interface ExchangeMonoInput {
  code: string;
  consentAccepted: boolean;
  scope: {
    periodDays: number;
  };
  consentTextVersion: string;
  institution?: {
    name?: string;
  };
  account?: {
    name?: string;
    mask?: string;
    currency?: string;
  };
}

export interface SyncResult {
  importedCount: number;
  skippedCount: number;
  fromDate?: string;
  toDate?: string;
}

export async function getConnections(businessId: string): Promise<BankConnection[]> {
  return http.get(`/businesses/${businessId}/bank/connections`);
}

export async function initMono(businessId: string): Promise<MonoInitResponse> {
  return http.post(`/businesses/${businessId}/bank/mono/init`, {});
}

export async function exchangeMono(
  businessId: string,
  data: ExchangeMonoInput
): Promise<BankConnection> {
  return http.post(`/businesses/${businessId}/bank/mono/exchange`, data);
}

export async function syncConnection(
  businessId: string,
  connectionId: string
): Promise<SyncResult> {
  return http.post(`/businesses/${businessId}/bank/connections/${connectionId}/sync`, {});
}

export async function disconnectConnection(
  businessId: string,
  connectionId: string
): Promise<{ success: boolean }> {
  return http.delete(`/businesses/${businessId}/bank/connections/${connectionId}`);
}

export const api = {
  getConnections,
  initMono,
  exchangeMono,
  syncConnection,
  disconnectConnection,
};

