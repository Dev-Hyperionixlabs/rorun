"use client";

import { getStoredAuthToken, clearAuthToken } from "../auth-token";

// Single source of truth for API base URL
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
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
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

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

  const url = `${API_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle 401 - redirect to login
    if (res.status === 401) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Session expired. Please log in again.");
    }

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
    throw new ApiError(0, "Network error. Please check your connection.");
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

