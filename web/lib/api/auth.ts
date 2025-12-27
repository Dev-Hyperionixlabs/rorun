"use client";

import { api } from "./client";
import { storeAuthToken, clearAuthToken } from "../auth-token";

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    phone: string;
    name?: string;
    email?: string;
    languagePref?: string;
  };
}

export async function login(args: {
  phone: string;
  name?: string;
  email?: string;
}): Promise<LoginResponse> {
  const response = await api.post<any>(
    "/auth/login",
    { phone: args.phone, name: args.name, email: args.email },
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
  const u = await api.get<any>("/auth/me");
  return {
    id: u.id,
    phone: u.phone,
    email: u.email || "",
    name: u.name || "",
    currentBusinessId: null,
    preferredLanguage: (u.languagePref === "pidgin" ? "pidgin" : "en") as
      | "en"
      | "pidgin",
  };
}

