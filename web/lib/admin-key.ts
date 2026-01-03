"use client";

const ADMIN_KEY_STORAGE = "rorun_admin_key";
const IMPERSONATING_FLAG = "rorun_impersonating";
const ADMIN_TOKEN_BACKUP = "rorun_admin_token_backup";
const ADMIN_RETURN_URL = "rorun_admin_return_url";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function setAdminKey(key: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function setImpersonatingFlag(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) window.localStorage.setItem(IMPERSONATING_FLAG, "1");
  else window.localStorage.removeItem(IMPERSONATING_FLAG);
}

export function isImpersonating(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(IMPERSONATING_FLAG) === "1";
}

export function backupAdminSession(token: string, returnUrl?: string) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(ADMIN_TOKEN_BACKUP, token);
  if (returnUrl) window.localStorage.setItem(ADMIN_RETURN_URL, returnUrl);
}

export function consumeAdminSessionBackup(): { token: string | null; returnUrl: string | null } {
  if (typeof window === "undefined") return { token: null, returnUrl: null };
  const token = window.localStorage.getItem(ADMIN_TOKEN_BACKUP);
  const returnUrl = window.localStorage.getItem(ADMIN_RETURN_URL);
  window.localStorage.removeItem(ADMIN_TOKEN_BACKUP);
  window.localStorage.removeItem(ADMIN_RETURN_URL);
  return { token, returnUrl };
}


