import { FirsReadyStatus } from "../types";
import { API_BASE, authHeaders } from "./client";

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

