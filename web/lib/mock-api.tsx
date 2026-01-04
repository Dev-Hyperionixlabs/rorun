"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
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
import { getStoredAuthToken } from "./auth-token";
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
import {
  getFilingPackStatus,
  generateFilingPack as generateFilingPackApi,
  FilingPack as ApiFilingPack,
} from "./api/filingPacks";
import { getYearSummary } from "./api/summary";
import { updateProfileApi } from "./api/profile";
import { getDocuments as fetchDocuments, uploadDocument } from "./api/documents";
import { ApiError, API_BASE, api } from "./api/client";

type Document = import("./api/documents").Document;

function toUiFilingPack(pack: ApiFilingPack): FilingPack {
  return {
    id: pack.id,
    businessId: pack.businessId,
    taxYear: pack.taxYear,
    createdAt: pack.createdAt,
    createdByUserId: (pack as any).requestedByUserId || (pack as any).createdByUserId || "",
    status: pack.status === "ready" ? "ready" : "failed",
    pdfUrl: pack.pdfUrl ?? null,
    csvUrl: pack.csvUrl ?? null,
    metadataJson: null,
  };
}

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

const CURRENT_BUSINESS_STORAGE_KEY = "rorun_current_business_id";

// IMPORTANT: Render cold starts + real-world latency can exceed a couple seconds.
// Keep this aligned with apiRequest default timeout so we don't show false "API unreachable".
async function checkApiHealth(baseUrl: string, timeoutMs = 20_000): Promise<boolean> {
  const base = baseUrl.replace(/\/+$/, "");
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const primaryUrl = `${base}/health`;
    const altUrl =
      base.endsWith("/api") || base.includes("/api/")
        ? `${base.replace(/\/api$/, "")}/health`
        : `${base}/api/health`;

    const doFetch = (url: string) =>
      fetch(url, { method: "GET", cache: "no-store", signal: ctrl.signal });

    let res = await doFetch(primaryUrl);
    if (!res.ok && altUrl !== primaryUrl) {
      res = await doFetch(altUrl);
    }
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

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
  const pathname = usePathname();
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
      const baseUrl = API_BASE;
      const healthy = await checkApiHealth(baseUrl);
      if (!healthy) {
        // DEV-only escape hatch: allow UI to boot without API for interaction testing / offline dev.
        // IMPORTANT: this must never be enabled by default.
        if (process.env.NEXT_PUBLIC_USE_MOCK_API === "true") {
          const demoBusinessId = "local-demo-business";
          setState((s) => ({
            ...s,
            loading: false,
            error: undefined,
            user: {
              id: "local-demo-user",
              phone: "+2340000000000",
              name: "Local Demo",
              email: "local@demo",
              preferredLanguage: "en",
              currentBusinessId: demoBusinessId,
            } as any,
            businesses: [
              {
                id: demoBusinessId,
                name: "Local Demo Workspace",
                state: "Lagos",
                legalForm: "sole_proprietorship",
                sector: "general",
                turnoverBand: "<25m",
              } as any,
            ],
            currentBusinessId: demoBusinessId,
            alerts: [],
            transactions: [],
            documents: [],
            knowledge: [],
            currentPlanId: "free",
            yearSummaries: [emptySummary(new Date().getFullYear())],
          }));
          return;
        }

        setState((s) => ({
          ...s,
          loading: false,
          user: null,
          businesses: [],
          currentBusinessId: null,
          error: `Can't reach the API at ${baseUrl}. Please check the API is running and that CORS allows this site, then retry.`,
        }));
        return;
      }

      const [user, businesses, knowledge] = await Promise.all([
        getCurrentUser(),
        // If businesses fails, treat it as a real failure (don't silently continue with stale IDs)
        getBusinesses(),
        getKnowledgeArticles().catch(() => []),
      ]);

      // Prefer a previously selected workspace if present and still valid.
      let preferredBusinessId: string | null = null;
      try {
        preferredBusinessId = window.localStorage.getItem(CURRENT_BUSINESS_STORAGE_KEY);
      } catch {
        preferredBusinessId = null;
      }

      const preferredValid =
        preferredBusinessId && businesses.some((b) => b.id === preferredBusinessId)
          ? preferredBusinessId
          : null;
      const userPreferredValid =
        user?.currentBusinessId && businesses.some((b) => b.id === user.currentBusinessId)
          ? user.currentBusinessId
          : null;

      const businessId = preferredValid || userPreferredValid || businesses[0]?.id || null;
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
        user: user && businessId ? ({ ...user, currentBusinessId: businessId } as any) : user,
        businesses,
        currentBusinessId: businessId,
        alerts,
        transactions: txResponse.items || [],
        documents,
        currentPlanId: resolvedPlanId,
        knowledge,
        yearSummaries: [summary],
      }));

      if (businessId) {
        try {
          window.localStorage.setItem(CURRENT_BUSINESS_STORAGE_KEY, businessId);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      // If auth is missing/expired, api client already triggers a redirect to /login.
      if (err instanceof ApiError && err.status === 401) {
        setState((s) => ({
          ...s,
          loading: false,
          user: null,
          businesses: [],
          currentBusinessId: null,
          error: undefined,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        loading: false,
        error: err?.message || "Failed to load app data",
      }));
    }
  };

  useEffect(() => {
    const hasToken = !!getStoredAuthToken();
    const isProtectedRoute =
      (pathname || "").startsWith("/app") || (pathname || "").startsWith("/admin");

    // On public pages (/, /login, /signup, /help, etc.), don't spam /auth/me without a token.
    // This prevents 401 redirect loops and 429 rate limiting on production.
    if (!isProtectedRoute && !hasToken) {
      setState((s) => ({
        ...s,
        loading: false,
        error: undefined,
        user: null,
        businesses: [],
        currentBusinessId: null,
      }));
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
        // Use api.post directly to ensure proper field mapping
        const created = await api.post<any>(`/businesses/${businessId}/transactions`, {
          type: input.type,
          amount: input.amount,
          description: input.description,
          categoryId: (input as any).categoryId || undefined,
          date: input.date,
          source: 'manual',
          currency: 'NGN',
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
        // First check if a ready pack already exists
        const existing = await getFilingPackStatus(bId, year);
        if (existing.pack?.status === "ready") return toUiFilingPack(existing.pack);

        // Trigger generation
        await generateFilingPackApi(bId, year);

        // Poll until ready/failed (bounded)
        for (let i = 0; i < 15; i++) {
          const { pack } = await getFilingPackStatus(bId, year);
          if (pack?.status === "ready") return toUiFilingPack(pack);
          if (pack?.status === "failed") {
            throw new Error(pack.errorMessage || "Filing pack generation failed");
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
        throw new Error("Filing pack is still generating. Please check back soon.");
      },
      async addDocument(file, relatedTransactionId) {
        if (!businessId) throw new ApiError(400, "No business selected");
        const doc = await uploadDocument(businessId, file, relatedTransactionId);
        setState((s) => ({ ...s, documents: [doc, ...s.documents] }));
        return doc;
      },
      setCurrentBusiness(id: string) {
        try {
          window.localStorage.setItem(CURRENT_BUSINESS_STORAGE_KEY, id);
        } catch {
          // ignore
        }
        setState((s) => ({
          ...s,
          currentBusinessId: id,
          user: s.user ? ({ ...s.user, currentBusinessId: id } as any) : s.user,
        }));
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

