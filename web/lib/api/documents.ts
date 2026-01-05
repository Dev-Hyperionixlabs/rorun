"use client";

import { api, API_BASE, authHeaders } from "./client";

export interface Document {
  id: string;
  businessId: string;
  // Newer shape
  type?: string;
  storageUrl?: string;
  mimeType?: string;
  size?: number;
  // Older/UI-friendly shape
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  url?: string;
  relatedTransactionId?: string;
  ocrStatus?: string;
  createdAt: string;
  uploadedAt?: string;
  viewUrl?: string;
}

export async function getDocuments(businessId: string): Promise<Document[]> {
  const data = await api.get<any>(`/businesses/${businessId}/documents`, { timeoutMs: 20_000 });
  const items = Array.isArray(data) ? data : data.items || [];

  return items.map((doc: any) => ({
    ...doc,
    // Keep these aliases stable for UI
    url: doc.url || doc.fileUrl || doc.viewUrl || doc.storageUrl,
    fileUrl: doc.fileUrl || doc.url || doc.viewUrl || doc.storageUrl,
    fileName: doc.fileName || doc.name || doc.originalName,
    type: doc.type || doc.fileType || doc.documentType,
    fileType: doc.fileType || doc.type,
    uploadedAt: doc.uploadedAt || doc.createdAt,
    createdAt: doc.createdAt || doc.uploadedAt,
    ocrStatus: doc.ocrStatus || doc.status,
  }));
}

export async function uploadDocument(
  businessId: string,
  file: File,
  relatedTransactionId?: string
): Promise<Document> {
  const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (!mimeType) throw new Error("Could not determine file type.");

  // 1) Get signed upload URL from server
  const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string }>(
    `/businesses/${businessId}/documents/upload-url`,
    { filename: file.name, mimeType },
    { timeoutMs: 20_000 }
  );

  // 2) Upload bytes directly to storage
  try {
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error("Upload failed. Please try again.");
    }
  } catch (e: any) {
    // Common in production with R2/S3-compatible buckets when CORS isn't configured.
    // Fallback to server-side upload to avoid browser-to-storage CORS preflight.
    if (!API_BASE) {
      throw new Error("API is not configured.");
    }
    const form = new FormData();
    form.append("file", file);
    if (relatedTransactionId) form.append("relatedTransactionId", relatedTransactionId);
    // Heuristic type
    const docType =
      mimeType === "application/pdf" && /statement|bank/i.test(file.name) ? "bank_statement" : "receipt";
    form.append("type", docType);

    const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/businesses/${businessId}/documents/upload`, {
      method: "POST",
      headers: {
        ...authHeaders(),
      },
      body: form,
      credentials: "include",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Upload failed. Please try again.");
    }
    const doc = await res.json();
    return {
      ...doc,
      url: doc.url || doc.fileUrl || doc.viewUrl || doc.storageUrl,
      fileUrl: doc.fileUrl || doc.url || doc.viewUrl || doc.storageUrl,
      fileName: doc.fileName || doc.name || doc.originalName,
      type: doc.type || doc.fileType || doc.documentType,
      fileType: doc.fileType || doc.type,
      uploadedAt: doc.uploadedAt || doc.createdAt,
      createdAt: doc.createdAt || doc.uploadedAt,
      ocrStatus: doc.ocrStatus || doc.status,
    };
  }

  // 3) Register document with API (server verifies object exists + signature)
  const docType =
    mimeType === "application/pdf" && /statement|bank/i.test(file.name) ? "bank_statement" : "receipt";
  const doc = await api.post<any>(
    `/businesses/${businessId}/documents`,
    {
      type: docType,
      storageUrl: key,
      mimeType,
      size: file.size,
      relatedTransactionId: relatedTransactionId || undefined,
    },
    { timeoutMs: 20_000 }
  );
  return {
    ...doc,
    url: doc.url || doc.fileUrl || doc.viewUrl || doc.storageUrl,
    fileUrl: doc.fileUrl || doc.url || doc.viewUrl || doc.storageUrl,
    fileName: doc.fileName || doc.name || doc.originalName,
    type: doc.type || doc.fileType || doc.documentType,
    fileType: doc.fileType || doc.type,
    uploadedAt: doc.uploadedAt || doc.createdAt,
    createdAt: doc.createdAt || doc.uploadedAt,
    ocrStatus: doc.ocrStatus || doc.status,
  };
}

/**
 * Upload via server-side multipart first (avoids browser->R2/S3 CORS preflight failures).
 * Intended for bank statements (PDF/CSV) where direct PUT often fails in prod.
 */
export async function uploadDocumentServerFirst(
  businessId: string,
  file: File,
  relatedTransactionId?: string,
): Promise<Document> {
  const mimeType = file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "");
  if (!mimeType) throw new Error("Could not determine file type.");
  if (!API_BASE) throw new Error("API is not configured.");

  const form = new FormData();
  form.append("file", file);
  if (relatedTransactionId) form.append("relatedTransactionId", relatedTransactionId);
  const docType =
    mimeType === "application/pdf" && /statement|bank/i.test(file.name) ? "bank_statement" : "receipt";
  form.append("type", docType);

  const res = await fetch(`${API_BASE.replace(/\/+$/, "")}/businesses/${businessId}/documents/upload`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: form,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Upload failed. Please try again.");
  }
  const doc = await res.json();
  return {
    ...doc,
    url: doc.url || doc.fileUrl || doc.viewUrl || doc.storageUrl,
    fileUrl: doc.fileUrl || doc.url || doc.viewUrl || doc.storageUrl,
    fileName: doc.fileName || doc.name || doc.originalName,
    type: doc.type || doc.fileType || doc.documentType,
    fileType: doc.fileType || doc.type,
    uploadedAt: doc.uploadedAt || doc.createdAt,
    createdAt: doc.createdAt || doc.uploadedAt,
    ocrStatus: doc.ocrStatus || doc.status,
  };
}

export async function updateDocument(
  businessId: string,
  docId: string,
  dto: { relatedTransactionId?: string | null }
): Promise<Document> {
  const doc = await api.put<any>(
    `/businesses/${businessId}/documents/${docId}`,
    dto,
    { timeoutMs: 20_000 }
  );
  return {
    ...doc,
    url: doc.url || doc.fileUrl || doc.viewUrl || doc.storageUrl,
    fileUrl: doc.fileUrl || doc.url || doc.viewUrl || doc.storageUrl,
    fileName: doc.fileName || doc.name || doc.originalName,
    type: doc.type || doc.fileType || doc.documentType,
    fileType: doc.fileType || doc.type,
    uploadedAt: doc.uploadedAt || doc.createdAt,
    createdAt: doc.createdAt || doc.uploadedAt,
    ocrStatus: doc.ocrStatus || doc.status,
  };
}

export async function deleteDocument(businessId: string, docId: string): Promise<void> {
  await api.delete(`/businesses/${businessId}/documents/${docId}`, { timeoutMs: 20_000 });
}

