export type PlanId = "free" | "basic" | "business" | "accountant";

export type PlanFeatureKey =
  | "taxStatusCheck"
  | "firsReadyDashboard"
  | "basicBookkeeping"
  | "standardAlerts"
  | "educationHub"
  | "yearEndFilingPack"
  | "exportTransactions"
  | "emailSupport"
  | "advancedReminders"
  | "multiUserAccess"
  | "enhancedSummaryReports"
  | "multiWorkspaceView"
  | "prioritySupport";

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

export interface PlanMeta {
  id: PlanId;
  name: string;
  tagline: string;
  priceLabel: string;
  bestFor: string;
  highlight?: boolean;
  features: PlanFeatures;
}

const baseFree: PlanFeatures = {
  taxStatusCheck: true,
  firsReadyDashboard: true,
  basicBookkeeping: true,
  standardAlerts: true,
  educationHub: true,
  yearEndFilingPack: false,
  exportTransactions: false,
  emailSupport: false,
  advancedReminders: false,
  multiUserAccess: false,
  enhancedSummaryReports: false,
  multiWorkspaceView: false,
  prioritySupport: false,
};

export const PLANS: PlanMeta[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Get started with core tax safety basics.",
    priceLabel: "Free",
    bestFor: "Solo and very small businesses testing Rorun.",
    features: {
      ...baseFree,
    },
  },
  {
    id: "basic",
    name: "Basic",
    tagline: "Everything in Free, plus filing-ready packs.",
    priceLabel: "₦ — /mo",
    bestFor: "Growing SMEs that want simple annual filing.",
    features: {
      ...baseFree,
      yearEndFilingPack: true,
      exportTransactions: true,
      emailSupport: true,
    },
  },
  {
    id: "business",
    name: "Business",
    tagline: "For SMEs that want to stay ahead of FIRS.",
    priceLabel: "₦ — /mo",
    bestFor: "Established SMEs with staff and regular filings.",
    highlight: true,
    features: {
      ...baseFree,
      yearEndFilingPack: true,
      exportTransactions: true,
      emailSupport: true,
      advancedReminders: true,
      multiUserAccess: true,
      enhancedSummaryReports: true,
    },
  },
  {
    id: "accountant",
    name: "Accountant",
    tagline: "For firms managing multiple SME clients.",
    priceLabel: "Talk to us",
    bestFor: "Accountants and tax consultants.",
    features: {
      ...baseFree,
      yearEndFilingPack: true,
      exportTransactions: true,
      emailSupport: true,
      advancedReminders: true,
      multiUserAccess: true,
      enhancedSummaryReports: true,
      multiWorkspaceView: true,
      prioritySupport: true,
    },
  },
];

export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  taxStatusCheck: "Tax status check (eligibility)",
  firsReadyDashboard: "Dashboard with FIRS-Ready Status",
  basicBookkeeping: "Basic income & expense tracking",
  standardAlerts: "Standard deadline alerts",
  educationHub: "Education hub (English + Pidgin)",
  yearEndFilingPack: "Year-end filing pack (PDF + CSV)",
  exportTransactions: "Exportable transaction history",
  emailSupport: "Email support",
  advancedReminders: "Advanced smart reminders",
  multiUserAccess: "Multi-user access (up to X users)",
  enhancedSummaryReports: "Enhanced summary views & reporting",
  multiWorkspaceView: "Multi-workspace / multi-client view",
  prioritySupport: "Priority support",
};

export function getPlanMeta(id: PlanId): PlanMeta {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan id: ${id}`);
  return plan;
}

export function planHasFeature(planId: PlanId, feature: PlanFeatureKey): boolean {
  return getPlanMeta(planId).features[feature] ?? false;
}

