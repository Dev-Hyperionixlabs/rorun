'use client';

import React, { createContext, useContext, useState, useMemo } from "react";
import { nanoid } from "./nanoid";
import {
  Alert,
  Business,
  EligibilityResult,
  FilingPack,
  KnowledgeArticle,
  Plan,
  PlanId,
  Transaction,
  User,
  YearSummary
} from "./types";

interface Document {
  id: string;
  fileName: string;
  type: string;
  uploadedAt: string;
  url?: string;
}

interface MockApiState {
  user: User;
  businesses: Business[];
  transactions: Transaction[];
  documents: Document[];
  alerts: Alert[];
  plans: Plan[];
  currentPlanId: PlanId;
  yearSummaries: YearSummary[];
  knowledge: KnowledgeArticle[];
}

interface MockApiContextValue extends MockApiState {
  setCurrentPlan(id: PlanId): void;
  updateUser(patch: Partial<User>): void;
  updateBusiness(id: string, patch: Partial<Business>): void;
  evaluateEligibility(businessId: string): Promise<EligibilityResult>;
  addTransaction(input: Omit<Transaction, "id">): Promise<Transaction>;
  deleteTransaction(id: string): Promise<void>;
  markAlertRead(id: string): void;
  generateFilingPack(businessId: string, year: number): Promise<FilingPack>;
  addDocument(doc: Document): void;
}

const MockApiContext = createContext<MockApiContextValue | null>(null);

const initialUser: User = {
  id: "user-1",
  name: "Rorun Demo",
  email: "demo@rorun.ng",
  phone: "+2348012345678",
  currentBusinessId: "biz-1",
  preferredLanguage: "en"
};

const initialBusiness: Business = {
  id: "biz-1",
  name: "Demo Ventures",
  role: "Owner",
  legalForm: "sole_proprietor",
  sector: "Retail / Trade",
  state: "Lagos",
  hasCAC: true,
  hasTIN: true,
  vatRegistered: false,
  turnoverBand: "<25m"
};

const initialPlans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "₦0 / month",
    description: "For very small, informal businesses.",
    features: [
      "Eligibility checker",
      "Up to 100 transactions / year",
      "Basic year-end summary"
    ]
  },
  {
    id: "basic",
    name: "Basic",
    priceLabel: "₦3,500 / month",
    description: "For small businesses keeping regular records.",
    features: [
      "Everything in Free",
      "Unlimited transactions",
      "Document storage",
      "Alerts and reminders"
    ]
  },
  {
    id: "business",
    name: "Business",
    priceLabel: "₦8,500 / month",
    description: "For growing SMEs that want deeper insight.",
    features: [
      "Everything in Basic",
      "Advanced reports",
      "Priority support"
    ]
  },
  {
    id: "accountant",
    name: "Accountant",
    priceLabel: "Contact us",
    description: "For accountants managing multiple clients.",
    features: [
      "Multi-business view",
      "Export packs for all clients",
      "Team access"
    ]
  }
];

const initialAlerts: Alert[] = [
  {
    id: "alert-1",
    businessId: "biz-1",
    type: "deadline",
    severity: "warning",
    title: "VAT filing deadline in 30 days",
    message:
      "If you register for VAT, your first return will be due 30 days after month end.",
    createdAt: new Date().toISOString()
  },
  {
    id: "alert-2",
    businessId: "biz-1",
    type: "threshold",
    severity: "info",
    title: "You are at 65% of your ₦25m turnover band",
    message:
      "If you cross ₦25m in 12 months, some of your tax obligations change. Keep an eye on this.",
    createdAt: new Date().toISOString()
  }
];

const initialKnowledge: KnowledgeArticle[] = [
  {
    id: "k1",
    slug: "what-does-0-tax-mean",
    title: "What does 0% tax really mean?",
    language: "en",
    tags: ["basics"],
    content:
      "For many micro and small Nigerian businesses, company income tax (CIT) is effectively 0% if your turnover is below ₦25m. That does not mean you can ignore FIRS. You still need to file, keep records and respond to notices."
  },
  {
    id: "k1-pidgin",
    slug: "what-does-0-tax-mean",
    title: "Wetn 0% tax really mean?",
    language: "pidgin",
    tags: ["basics"],
    content:
      "If your business dey make less than ₦25m a year, government no go collect CIT from you. But e no mean say you go just ghost FIRS. You still need gist dem small, file your paper and keep beta records."
  }
];

const defaultSummary: YearSummary = {
  year: new Date().getFullYear(),
  totalIncome: 0,
  totalExpenses: 0,
  profit: 0,
  byCategory: [],
  packs: []
};

export const MockApiProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [state, setState] = useState<MockApiState>({
    user: initialUser,
    businesses: [initialBusiness],
    transactions: [],
    documents: [],
    alerts: initialAlerts,
    plans: initialPlans,
    currentPlanId: "free",
    yearSummaries: [defaultSummary],
    knowledge: initialKnowledge
  });

  const value: MockApiContextValue = useMemo(
    () => ({
      ...state,
      setCurrentPlan: (id) =>
        setState((s) => ({
          ...s,
          currentPlanId: id
        })),
      updateUser: (patch) =>
        setState((s) => ({
          ...s,
          user: { ...s.user, ...patch }
        })),
      updateBusiness: (id, patch) =>
        setState((s) => ({
          ...s,
          businesses: s.businesses.map((b) =>
            b.id === id ? { ...b, ...patch } : b
          )
        })),
      async evaluateEligibility(businessId) {
        const business = state.businesses.find((b) => b.id === businessId);
        const year = new Date().getFullYear();
        const result: EligibilityResult = {
          year,
          citStatus:
            business?.turnoverBand === "<25m" ? "exempt" : "liable",
          vatStatus: business?.vatRegistered
            ? "registered"
            : business?.turnoverBand === "<25m"
            ? "not_required"
            : "must_register",
          whtSummary:
            "You may need to deduct or suffer withholding tax depending on who you trade with. Rorun will highlight common cases.",
          headline:
            business?.turnoverBand === "<25m"
              ? "You qualify for 0% company income tax."
              : "You may need to pay company income tax.",
          explanation: [
            "Keep simple, accurate records of income and expenses.",
            "File at least once a year even if tax due is 0.",
            "Respond quickly to any FIRS notices to avoid penalties."
          ],
          riskLevel:
            business?.turnoverBand === "<25m" ? "safe" : "attention"
        };

        setState((s) => ({
          ...s,
          businesses: s.businesses.map((b) =>
            b.id === businessId ? { ...b, eligibility: result } : b
          )
        }));

        return new Promise<EligibilityResult>((resolve) =>
          setTimeout(() => resolve(result), 500)
        );
      },
      async addTransaction(input) {
        const tx: Transaction = { ...input, id: nanoid() };
        setState((s) => ({
          ...s,
          transactions: [tx, ...s.transactions]
        }));
        return new Promise<Transaction>((resolve) =>
          setTimeout(() => resolve(tx), 300)
        );
      },
      async deleteTransaction(id) {
        setState((s) => ({
          ...s,
          transactions: s.transactions.filter((t) => t.id !== id)
        }));
      },
      markAlertRead(id) {
        setState((s) => ({
          ...s,
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, readAt: new Date().toISOString() } : a
          )
        }));
      },
      async generateFilingPack(businessId, year) {
        const pack: FilingPack = {
          id: nanoid(),
          year,
          createdAt: new Date().toISOString(),
          pdfUrl: "#",
          csvUrl: "#"
        };
        setState((s) => {
          const summaries = s.yearSummaries.length
            ? s.yearSummaries
            : [defaultSummary];
          return {
            ...s,
            yearSummaries: summaries.map((ys) =>
              ys.year === year
                ? { ...ys, packs: [pack, ...ys.packs] }
                : ys
            )
          };
        });
        return new Promise<FilingPack>((resolve) =>
          setTimeout(() => resolve(pack), 1000)
        );
      },
      addDocument(doc) {
        setState((s) => ({
          ...s,
          documents: [doc, ...s.documents]
        }));
      }
    }),
    [state]
  );

  return (
    <MockApiContext.Provider value={value}>
      {children}
    </MockApiContext.Provider>
  );
};

export function useMockApi() {
  const ctx = useContext(MockApiContext);
  if (!ctx) {
    throw new Error("useMockApi must be used within MockApiProvider");
  }
  return ctx;
}


