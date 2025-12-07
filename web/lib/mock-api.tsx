"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PLANS, PlanMeta, PlanId } from "./plans";
import {
  Alert,
  Business,
  EligibilityResult,
  FilingPack,
  KnowledgeArticle,
  Transaction,
  User,
  YearSummary,
} from "./types";
import { getCurrentUser } from "./api/auth";
import {
  getBusinessPlan,
  getBusinesses,
  updateBusiness as updateBusinessApi,
  updateBusinessPlan,
} from "./api/businesses";
import { getTransactions as fetchTransactions, createTransaction, deleteTransaction } from "./api/transactions";
import { getAlerts as fetchAlerts, markAlertRead as markAlertReadApi } from "./api/alerts";
import { getKnowledgeArticles } from "./api/knowledge";
import { runEligibilityCheck } from "./api/eligibility";
import { getLatestFilingPack, createFilingPack } from "./api/filingPacks";
import { getYearSummary } from "./api/summary";
import { updateProfileApi } from "./api/profile";
import { getDocuments as fetchDocuments, uploadDocument } from "./api/documents";
import { ApiError } from "./api/client";

type Document = import("./api/documents").Document;

interface AppState {
  loading: boolean;
  error?: string;
  user: User | null;
  businesses: Business[];
  currentBusinessId: string | null;
  transactions: Transaction[];
  documents: Document[];
  alerts: Alert[];
  plans: PlanMeta[];
  currentPlanId: PlanId;
  yearSummaries: YearSummary[];
  knowledge: KnowledgeArticle[];
}

interface AppContextValue extends AppState {
  refresh(): Promise<void>;
  setCurrentPlan(id: PlanId): Promise<void>;
  updateUser(patch: Partial<User>): Promise<void>;
  updateBusiness(id: string, patch: Partial<Business>): Promise<void>;
  evaluateEligibility(businessId: string): Promise<EligibilityResult>;
  addTransaction(input: Omit<Transaction, "id" | "currency" | "hasDocument" | "categoryId">): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  markAlertRead(id: string): Promise<void>;
  generateFilingPack(businessId: string, year: number): Promise<FilingPack>;
  addDocument(file: File, relatedTransactionId?: string): Promise<Document>;
  setCurrentBusiness(id: string): void;
}

const AppContext = createContext<AppContextValue | null>(null);

async function safeApi<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn("App data fetch failed:", err);
    return fallback;
  }
}

const emptySummary = (year: number): YearSummary => ({
  year,
  totalIncome: 0,
  totalExpenses: 0,
  profit: 0,
  byCategory: [],
  packs: [],
});

export const MockApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    loading: true,
    user: null,
    businesses: [],
    currentBusinessId: null,
    transactions: [],
    documents: [],
    alerts: [],
    plans: PLANS,
    currentPlanId: "free",
    yearSummaries: [],
    knowledge: [],
  });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const [user, businesses, knowledge] = await Promise.all([
        getCurrentUser().catch(() => null),
        getBusinesses().catch(() => []),
        getKnowledgeArticles().catch(() => []),
      ]);

      const businessId = user?.currentBusinessId || businesses[0]?.id || null;
      const year = new Date().getFullYear();

      const [alerts, txResponse, documents, planResponse, summary] = await Promise.all([
        businessId ? fetchAlerts(businessId) : Promise.resolve([]),
        businessId ? fetchTransactions(businessId, { limit: 100 }) : Promise.resolve({ items: [], total: 0 }),
        businessId ? safeApi(() => fetchDocuments(businessId), []) : Promise.resolve([]),
        businessId ? getBusinessPlan(businessId).catch(() => null) : Promise.resolve(null),
        businessId
          ? safeApi(() => getYearSummary(businessId, year), emptySummary(year))
          : Promise.resolve(emptySummary(year)),
      ]);

      const resolvedPlanId = (planResponse?.planId as PlanId | undefined) ?? "free";

      setState((s) => ({
        ...s,
        loading: false,
        user,
        businesses,
        currentBusinessId: businessId,
        alerts,
        transactions: txResponse.items || [],
        documents,
        currentPlanId: resolvedPlanId,
        knowledge,
        yearSummaries: [summary],
      }));
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message || "Failed to load app data",
      }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const value = useMemo<AppContextValue>(() => {
    const businessId = state.currentBusinessId || state.user?.currentBusinessId || state.businesses[0]?.id || null;

    return {
      ...state,
      currentBusinessId: businessId,
      async refresh() {
        await load();
      },
      async setCurrentPlan(id: PlanId) {
        if (!businessId) return;
        await updateBusinessPlan(businessId, id);
        setState((s) => ({ ...s, currentPlanId: id }));
      },
      async updateUser(patch) {
        await updateProfileApi({
          name: patch.name,
          email: patch.email,
          preferredLanguage: patch.preferredLanguage,
        });
        setState((s) => (s.user ? { ...s, user: { ...s.user, ...patch } } : s));
      },
      async updateBusiness(id, patch) {
        const updated = await updateBusinessApi(id, patch);
        setState((s) => ({
          ...s,
          businesses: s.businesses.map((b) => (b.id === id ? { ...b, ...updated } : b)),
        }));
      },
      async evaluateEligibility(bId: string) {
        const result = await runEligibilityCheck(bId);
        setState((s) => ({
          ...s,
          businesses: s.businesses.map((b) => (b.id === bId ? { ...b, eligibility: result } : b)),
        }));
        return result;
      },
      async addTransaction(input) {
        if (!businessId) throw new ApiError(400, "No business selected");
        const created = await createTransaction({
          businessId,
          type: input.type,
          amount: input.amount,
          description: input.description,
          category: (input as any).categoryId,
          date: input.date,
        });
        setState((s) => ({
          ...s,
          transactions: [created as Transaction, ...s.transactions],
        }));
        return created as Transaction;
      },
      async deleteTransaction(id) {
        if (!businessId) return;
        await deleteTransaction(businessId, id);
        setState((s) => ({
          ...s,
          transactions: s.transactions.filter((t) => t.id !== id),
        }));
      },
      async markAlertRead(id) {
        if (!businessId) return;
        await markAlertReadApi(businessId, id);
        setState((s) => ({
          ...s,
          alerts: s.alerts.map((a) => (a.id === id ? { ...a, readAt: new Date().toISOString() } : a)),
        }));
      },
      async generateFilingPack(bId: string, year: number) {
        const existing = await getLatestFilingPack(bId, year);
        if (existing) return existing;
        return createFilingPack(bId, year);
      },
      async addDocument(file, relatedTransactionId) {
        if (!businessId) throw new ApiError(400, "No business selected");
        const doc = await uploadDocument(businessId, file, relatedTransactionId);
        setState((s) => ({ ...s, documents: [doc, ...s.documents] }));
        return doc;
      },
      setCurrentBusiness(id: string) {
        setState((s) => ({ ...s, currentBusinessId: id }));
      },
    };
  }, [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useMockApi() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useMockApi must be used within MockApiProvider");
  return ctx;
}

