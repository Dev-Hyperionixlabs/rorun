"use client";

import { getStoredAuthToken } from "../auth-token";
import { hardResetSession } from "../session";

// Single source of truth for API base URL
const DEV_FALLBACK_API = "http://localhost:3001";
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? DEV_FALLBACK_API : "");
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

// For historical helpers that relied on API_URL
const API_URL = API_BASE;

/**
 * Build authorization headers for authenticated API calls.
 * Always returns a plain string map, which is compatible with HeadersInit.
 */
export function authHeaders(): Record<string, string> {
  const bearer = API_TOKEN || getStoredAuthToken();
  if (!bearer) {
    return {};
  }

  return {
    Authorization: `Bearer ${bearer}`,
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  timeoutMs?: number;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(0, "API is not configured.", "API_NOT_CONFIGURED");
  }
  // Default higher than 12s to tolerate cold starts + slow networks.
  const { skipAuth = false, timeoutMs = 20_000, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth) {
    const token = getStoredAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const normalizeBase = (base: string) => base.replace(/\/+$/, "");
  const base = normalizeBase(API_URL);
  const endpointNorm = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const primaryUrl = `${base}${endpointNorm}`;
  const altUrl =
    base.endsWith("/api") || base.includes("/api/")
      ? `${base.replace(/\/api$/, "")}${endpointNorm}`
      : `${base}/api${endpointNorm}`;

  try {
    const debug = process.env.NEXT_PUBLIC_API_DEBUG === "true";
    if (debug) {
      // eslint-disable-next-line no-console
      console.debug("[API]", fetchOptions.method || "GET", primaryUrl);
    }

    const doFetch = async (url: string) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      return fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    };

    let res = await doFetch(primaryUrl);

    // If a proxy expects /api prefix (or the opposite), retry once on 404.
    if (res.status === 404 && altUrl !== primaryUrl) {
      res = await doFetch(altUrl);
    }

    // Handle 401 - redirect to login
    if (res.status === 401) {
      hardResetSession();
      if (typeof window !== "undefined") {
        // Avoid infinite reload loops if we're already on /login.
        try {
          const currentPath = window.location.pathname;
          if (currentPath !== "/login") {
            window.location.href = "/login?reason=session_expired";
          }
        } catch {
          window.location.href = "/login?reason=session_expired";
        }
      }
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    const url = res.url || primaryUrl;

    // Handle error responses
    if (!res.ok) {
      let errorMessage = `Request failed (${res.status})`;
      let errorCode: string | undefined;
      let errorData: any = {};

      try {
        errorData = await res.json();
        errorMessage = errorData.message || errorMessage;
        errorCode = errorData.code;
      } catch {
        // Response wasn't JSON, use status text
        errorMessage = res.statusText || errorMessage;
      }

      throw new ApiError(res.status, errorMessage, errorCode, errorData);
    }

    // Handle empty responses
    const text = await res.text();
    if (!text) return {} as T;

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    // Network error or other fetch failure
    const debug = process.env.NEXT_PUBLIC_API_DEBUG === "true";
    if (debug) {
      // eslint-disable-next-line no-console
      console.debug("[API] network failure", { url: primaryUrl, error });
    }

    if ((error as any)?.name === "AbortError") {
      throw new ApiError(0, "Request timed out. Please try again.", "TIMEOUT");
    }
    throw new ApiError(0, "Network error. Can’t reach the API. Please try again.", "NETWORK_ERROR");
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: "DELETE" }),
};

export function getApiUrl(): string {
  return API_URL;
}

export function useMockApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

