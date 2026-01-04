"use client";

import { api as http } from "./client";

export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";
export type InvoiceTaxType = "none" | "vat" | "wht" | "custom";
export type InvoiceTemplateKey = "classic" | "modern" | "minimal";

export interface Client {
  id: string;
  businessId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  businessId: string;
  clientId?: string | null;
  title: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  clientId?: string | null;
  jobId?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  status: InvoiceStatus;
  subtotalAmount?: number | null;
  taxType?: InvoiceTaxType | null;
  taxLabel?: string | null;
  taxRate?: number | null; // decimal in [0,1]
  taxAmount?: number | null;
  templateKey?: InvoiceTemplateKey | null;
  totalAmount: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;

  client?: Client | null;
  job?: Job | null;
  items?: InvoiceItem[];
}

export interface CreateClientInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}

export interface CreateJobInput {
  title: string;
  clientId?: string | null;
  notes?: string | null;
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  clientId?: string | null;
  jobId?: string | null;
  issueDate: string; // ISO date
  dueDate?: string | null; // ISO date
  currency?: string;
  notes?: string | null;
  taxType?: InvoiceTaxType | null;
  taxRate?: number | null; // decimal in [0,1]
  taxLabel?: string | null;
  templateKey?: InvoiceTemplateKey | null;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  clientId?: string | null;
  jobId?: string | null;
  issueDate?: string;
  dueDate?: string | null;
  status?: InvoiceStatus;
  notes?: string | null;
  taxType?: InvoiceTaxType | null;
  taxRate?: number | null; // decimal in [0,1]
  taxLabel?: string | null;
  templateKey?: InvoiceTemplateKey | null;
  items?: CreateInvoiceItemInput[];
}

export async function downloadInvoicePdf(businessId: string, invoiceId: string): Promise<Blob> {
  const { API_BASE, authHeaders } = await import("./client");
  if (!API_BASE) throw new Error("API is not configured.");
  const base = API_BASE.replace(/\/+$/, "");
  const res = await fetch(`${base}/businesses/${businessId}/invoices/${invoiceId}/pdf`, {
    method: "GET",
    headers: {
      ...authHeaders(),
    },
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to download PDF (${res.status})`);
  }
  return await res.blob();
}

export async function listClients(businessId: string): Promise<Client[]> {
  return http.get(`/businesses/${businessId}/clients`);
}

export async function createClient(businessId: string, data: CreateClientInput): Promise<Client> {
  return http.post(`/businesses/${businessId}/clients`, data);
}

export async function listJobs(businessId: string): Promise<Job[]> {
  return http.get(`/businesses/${businessId}/jobs`);
}

export async function createJob(businessId: string, data: CreateJobInput): Promise<Job> {
  return http.post(`/businesses/${businessId}/jobs`, data);
}

export async function listInvoices(businessId: string): Promise<Invoice[]> {
  return http.get(`/businesses/${businessId}/invoices`);
}

export async function getInvoice(businessId: string, id: string): Promise<Invoice> {
  // Backend route does not require businessId in the path, but keeping it in signature for scoping.
  return http.get(`/businesses/${businessId}/invoices/${id}`);
}

export async function createInvoice(businessId: string, data: CreateInvoiceInput): Promise<Invoice> {
  return http.post(`/businesses/${businessId}/invoices`, data);
}

export async function updateInvoice(businessId: string, id: string, data: UpdateInvoiceInput): Promise<Invoice> {
  return http.put(`/businesses/${businessId}/invoices/${id}`, data);
}

export async function markInvoicePaid(businessId: string, id: string): Promise<Invoice> {
  return http.post(`/businesses/${businessId}/invoices/${id}/mark-paid`, {});
}

export const invoicesApi = {
  listClients,
  createClient,
  listJobs,
  createJob,
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  markInvoicePaid,
  downloadInvoicePdf,
};


