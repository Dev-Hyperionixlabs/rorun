"use client";

import { getStoredAuthToken } from "../auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface Document {
  id: string;
  businessId: string;
  fileName: string;
  fileType?: string;
  fileUrl: string;
  url?: string; // Alias for fileUrl for compatibility
  type?: "receipt" | "bank_statement" | "other"; // Alias for fileType
  relatedTransactionId?: string;
  uploadedAt: string;
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
  const items = data.items || [];
  // Normalize: ensure both url/fileUrl and type/fileType are available
  return items.map((doc: any) => ({
    ...doc,
    url: doc.url || doc.fileUrl,
    fileUrl: doc.fileUrl || doc.url,
    type: doc.type || doc.fileType,
    fileType: doc.fileType || doc.type,
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
  // Normalize: ensure both url/fileUrl and type/fileType are available
  return {
    ...doc,
    url: doc.url || doc.fileUrl,
    fileUrl: doc.fileUrl || doc.url,
    type: doc.type || doc.fileType,
    fileType: doc.fileType || doc.type,
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

