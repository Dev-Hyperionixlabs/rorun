"use client";

import { api } from "./client";
import { storeAuthToken, clearAuthToken } from "../auth-token";

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    phone?: string | null;
    name?: string;
    email?: string;
    languagePref?: string;
  };
}

export async function login(args: { email: string; password: string }): Promise<LoginResponse> {
  const response = await api.post<any>(
    "/auth/login",
    { email: args.email, password: args.password },
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

export async function signup(args: {
  email: string;
  password: string;
  name?: string;
}): Promise<LoginResponse> {
  const response = await api.post<any>(
    "/auth/signup",
    { email: args.email, password: args.password, name: args.name },
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

export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  await api.post(
    "/auth/request-password-reset",
    { email },
    { skipAuth: true }
  );
  return { ok: true };
}

export async function resetPassword(args: {
  token: string;
  password: string;
}): Promise<{ ok: true }> {
  await api.post(
    "/auth/reset-password",
    { token: args.token, password: args.password },
    { skipAuth: true }
  );
  return { ok: true };
}

export async function resetPasswordDirect(args: {
  email: string;
  password: string;
}): Promise<{ ok: true }> {
  await api.post(
    "/auth/reset-password-direct",
    { email: args.email, password: args.password },
    { skipAuth: true }
  );
  return { ok: true };
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAuthToken();
  }
}

export async function getCurrentUser() {
  const u = await api.get<any>("/auth/me");
  return {
    id: u.id,
    phone: u.phone,
    email: u.email || "",
    name: u.name || "",
    currentBusinessId: u.currentBusinessId || null,
    preferredLanguage: (u.languagePref === "pidgin" ? "pidgin" : "en") as
      | "en"
      | "pidgin",
  };
}

