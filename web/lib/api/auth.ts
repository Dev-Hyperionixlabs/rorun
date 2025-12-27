"use client";

import { api } from "./client";
import { storeAuthToken, clearAuthToken } from "../auth-token";

export interface RequestOtpResponse {
  ok: true;
}

export interface VerifyOtpResponse {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
  };
}

export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  return api.post("/auth/request-otp", { phone }, { skipAuth: true });
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<VerifyOtpResponse> {
  const response = await api.post<any>(
    "/auth/verify-otp",
    { phone, code },
    { skipAuth: true }
  );

  const accessToken: string | undefined =
    response?.accessToken || response?.access_token;
  if (accessToken) {
    storeAuthToken(accessToken);
  }

  return {
    accessToken: accessToken || "",
    user: response.user,
  };
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAuthToken();
  }
}

export async function getCurrentUser() {
  return api.get("/auth/me");
}

