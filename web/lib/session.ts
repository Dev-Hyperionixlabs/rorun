"use client";

import { clearAuthToken } from "./auth-token";

const LEGACY_KEYS = [
  "auth_token",
  "rorun_auth_token",
  "rorun_token",
  "rorun_admin_key",
] as const;

export function hardResetSession() {
  if (typeof window === "undefined") return;
  clearAuthToken();
  for (const key of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
  try {
    window.sessionStorage.clear();
  } catch {
    // ignore
  }
}

export function logoutToHome() {
  hardResetSession();
  if (typeof window === "undefined") return;
  window.location.href = "/";
}


