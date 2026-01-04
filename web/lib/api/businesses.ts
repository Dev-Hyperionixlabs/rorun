"use client";

import { api } from "./client";
import { Business } from "../types";

export interface CreateBusinessInput {
  name: string;
  legalForm: string;
  sector?: string;
  state?: string;
  cacNumber?: string;
  tin?: string;
  vatRegistered?: boolean;
  estimatedTurnoverBand?: string;
  annualTurnoverNGN?: number | null;
  fixedAssetsNGN?: number | null;
  employeeCount?: number | null;
  accountingYearEndMonth?: number | null;
  accountingYearEndDay?: number | null;
  isProfessionalServices?: boolean;
  claimsTaxIncentives?: boolean;
  isNonResident?: boolean;
  sellsIntoNigeria?: boolean;
  einvoicingEnabled?: boolean;

  // Invoicing config (business-level defaults)
  invoiceDisplayName?: string | null;
  invoiceLogoUrl?: string | null;
  invoiceAddressLine1?: string | null;
  invoiceAddressLine2?: string | null;
  invoiceCity?: string | null;
  invoiceState?: string | null;
  invoiceCountry?: string | null;
  invoicePostalCode?: string | null;
  invoiceFooterNote?: string | null;
  invoiceTemplateKey?: "classic" | "modern" | "minimal" | null;
  paymentBankName?: string | null;
  paymentAccountName?: string | null;
  paymentAccountNumber?: string | null;
  paymentInstructionsNote?: string | null;
  defaultTaxType?: "none" | "vat" | "wht" | "custom" | null;
  defaultTaxRate?: number | null; // decimal in [0,1]
  defaultTaxLabel?: string | null;
}

export async function getBusinesses(): Promise<Business[]> {
  // Backend returns an array; older clients expected `{ items }`.
  const response = await api.get<any>("/businesses");
  if (Array.isArray(response)) return response as Business[];
  return (response?.items as Business[]) || [];
}

export async function getBusiness(id: string): Promise<Business> {
  return api.get(`/businesses/${id}`);
}

export async function createBusiness(data: CreateBusinessInput): Promise<Business> {
  return api.post("/businesses", data);
}

export async function updateBusiness(
  id: string,
  data: Partial<CreateBusinessInput>
): Promise<Business> {
  return api.put(`/businesses/${id}`, data);
}

export async function deleteBusiness(id: string): Promise<void> {
  return api.delete(`/businesses/${id}`);
}

// Plan management
export async function getBusinessPlan(businessId: string) {
  return api.get<{ planId: string }>(`/businesses/${businessId}/plan`);
}

export async function updateBusinessPlan(businessId: string, planId: string) {
  return api.post(`/businesses/${businessId}/plan`, { planId });
}

// Notification settings
export async function getNotificationSettings(businessId: string) {
  return api.get(`/businesses/${businessId}/notification-settings`);
}

export async function updateNotificationSettings(
  businessId: string,
  settings: {
    deadlineDueSoon?: boolean;
    deadlineVerySoon?: boolean;
    monthlyReminder?: boolean;
    missingReceipts?: boolean;
  }
) {
  return api.put(`/businesses/${businessId}/notification-settings`, settings);
}

