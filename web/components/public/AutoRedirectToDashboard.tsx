"use client";

import { useEffect } from "react";
import { getStoredAuthToken } from "@/lib/auth-token";

/**
 * If a user is already authenticated (token in localStorage),
 * treat "/" as an entry point and send them straight to the dashboard.
 */
export function AutoRedirectToDashboard() {
  useEffect(() => {
    try {
      const token = getStoredAuthToken();
      if (token) {
        window.location.replace("/app/dashboard");
      }
    } catch {
      // ignore
    }
  }, []);

  return null;
}


