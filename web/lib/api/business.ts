import { API_BASE, authHeaders } from "./client";

export async function updateBusinessApi(businessId: string, data: Record<string, any>) {
  if (!API_BASE) return null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  const res = await fetch(`${API_BASE}/businesses/${businessId}`, {
    method: "PUT",
    credentials: "include",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update business (${res.status})`);
  }
  return res.json();
}

