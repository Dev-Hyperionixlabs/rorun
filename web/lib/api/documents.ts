"use client";

import { api } from "./client";

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
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mimeType },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error("Upload failed. Please try again.");
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

