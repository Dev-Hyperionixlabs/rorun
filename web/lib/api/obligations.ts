"use client";

import { api } from "./client";

export type Obligation = {
  id: string;
  businessId: string;
  taxType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  status: "upcoming" | "due" | "overdue" | "fulfilled";
  createdAt: string;
  updatedAt: string;
};

export async function getObligations(businessId: string): Promise<Obligation[]> {
  return api.get(`/businesses/${businessId}/obligations`);
}

export async function generateObligations(businessId: string, year?: number): Promise<Obligation[]> {
  const qs = year ? `?year=${year}` : "";
  return api.post(`/businesses/${businessId}/obligations/generate${qs}`, {});
}


