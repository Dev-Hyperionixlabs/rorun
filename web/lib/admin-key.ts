"use client";

const ADMIN_KEY_STORAGE = "rorun_admin_key";
const IMPERSONATING_FLAG = "rorun_impersonating";

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


