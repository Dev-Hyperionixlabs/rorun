import { FirsReadyStatus } from "../types";
import { getStoredAuthToken } from "../auth-token";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

function authHeaders() {
  const bearer = API_TOKEN || getStoredAuthToken();
  return bearer ? { Authorization: `Bearer ${bearer}` } : {};
}

export async function getFirsReadyStatus(businessId: string, year: number) {
  if (!API_BASE) return null;
  const res = await fetch(
    `${API_BASE}/businesses/${businessId}/tax-safety/firs-ready?year=${year}`,
    {
      credentials: "include",
      headers: authHeaders(),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data as FirsReadyStatus;
}

