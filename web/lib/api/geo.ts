"use client";

import { api } from "./client";

export type GeoResult = {
  countryCode: string | null;
  isNG: boolean | null;
  source: string | null;
};

export async function getGeo(): Promise<GeoResult> {
  return api.get<GeoResult>(`/geo`, { skipAuth: true, timeoutMs: 4000 });
}


