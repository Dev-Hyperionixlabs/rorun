import { API_BASE, authHeaders } from "./client";

export async function updateProfileApi(data: { name?: string; email?: string; preferredLanguage?: string }) {
  if (!API_BASE) return null;
  const res = await fetch(`${API_BASE}/me`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update profile (${res.status})`);
  }
  return res.json();
}

