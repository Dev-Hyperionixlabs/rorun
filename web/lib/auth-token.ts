"use client";

const STORAGE_KEY = "rorun_token";
const COOKIE_KEY = "rorun_token";

function isHttps(): boolean {
  try {
    return typeof window !== "undefined" && window.location.protocol === "https:";
  } catch {
    return false;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = Math.max(0, Math.floor(days * 24 * 60 * 60));

  // If we're on *.rorun.ng, write cookie to parent domain so it survives www<->apex redirects.
  let domainAttr = "";
  try {
    const host = window.location.hostname;
    if (host === "rorun.ng" || host.endsWith(".rorun.ng")) {
      domainAttr = "; Domain=.rorun.ng";
    }
  } catch {
    // ignore
  }

  const secureAttr = isHttps() ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secureAttr}${domainAttr}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  // Delete on current host
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  // Best-effort delete on parent domain as well
  try {
    const host = window.location.hostname;
    if (host === "rorun.ng" || host.endsWith(".rorun.ng")) {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Domain=.rorun.ng`;
    }
  } catch {
    // ignore
  }
}

export function storeAuthToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, token);
  // 30 days is long enough to avoid annoying relogins but short enough to limit exposure.
  setCookie(COOKIE_KEY, token, 30);
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY) || getCookie(COOKIE_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  deleteCookie(COOKIE_KEY);
}

