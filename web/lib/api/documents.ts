"use client";

import { getStoredAuthToken } from "../auth-token";
import { API_BASE } from "./client";

const API_URL = API_BASE;

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
  const token = getStoredAuthToken();
  const res = await fetch(`${API_URL}/businesses/${businessId}/documents`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch documents");
  const data = await res.json();
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
  const token = getStoredAuthToken();
  const formData = new FormData();
  formData.append("file", file);
  if (relatedTransactionId) {
    formData.append("relatedTransactionId", relatedTransactionId);
  }

  const res = await fetch(`${API_URL}/businesses/${businessId}/documents`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      // Note: Don't set Content-Type for FormData, browser sets it automatically with boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to upload document");
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
  const token = getStoredAuthToken();
  const res = await fetch(`${API_URL}/businesses/${businessId}/documents/${docId}`, {
    method: "PUT",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update document");
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

export async function deleteDocument(businessId: string, docId: string): Promise<void> {
  const token = getStoredAuthToken();
  const res = await fetch(`${API_URL}/businesses/${businessId}/documents/${docId}`, {
    method: "DELETE",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
  if (!res.ok) throw new Error("Failed to delete document");
}

