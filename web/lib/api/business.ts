import { getStoredAuthToken } from "../auth-token";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

function authHeaders() {
  const bearer = API_TOKEN || getStoredAuthToken();
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
}

export async function updateBusinessApi(businessId: string, data: Record<string, any>) {
  if (!API_BASE) return null;
  const headers: HeadersInit = {
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

