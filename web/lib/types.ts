export type PlanId = "free" | "basic" | "business" | "accountant";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentBusinessId: string | null;
  preferredLanguage: "en" | "pidgin";
}

export const BUSINESS_ROLES = [
  "Owner",
  "Co-owner / Partner",
  "Manager",
  "Accountant / Finance",
  "Operations / Staff",
  "Consultant / Advisor",
  "Other"
] as const;

export type BusinessRole = (typeof BUSINESS_ROLES)[number];

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
  "FCT (Abuja)"
] as const;

export interface Business {
  id: string;
  name: string;
  role: BusinessRole;
  legalForm: "sole_proprietor" | "partnership" | "company" | "freelancer";
  sector: string;
  state: string;
  hasCAC: boolean;
  hasTIN: boolean;
  vatRegistered: boolean;
  turnoverBand: "<25m" | "25-100m" | ">100m";
  // Tax profile fields (used by Tax Rules Engine + obligations)
  annualTurnoverNGN?: number | null;
  fixedAssetsNGN?: number | null;
  employeeCount?: number | null;
  accountingYearEndMonth?: number | null; // 1-12
  accountingYearEndDay?: number | null; // 1-31
  isProfessionalServices?: boolean;
  claimsTaxIncentives?: boolean;
  isNonResident?: boolean;
  sellsIntoNigeria?: boolean;
  einvoicingEnabled?: boolean;
  eligibility?: EligibilityResult;
}

export interface EligibilityResult {
  year: number;
  citStatus: "exempt" | "liable" | "unknown";
  vatStatus: "not_required" | "must_register" | "registered";
  whtSummary: string;
  headline: string;
  explanation: string[];
  riskLevel: "safe" | "attention" | "risk";
}

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  businessId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  date: string; // ISO
  description: string;
  categoryId: string;
  aiCategoryId?: string;
  aiConfidence?: number;
  isBusinessFlag?: boolean;
  hasDocument: boolean;
}

export interface Document {
  id: string;
  businessId: string;
  transactionId?: string;
  url: string;
  type: "receipt" | "bank_statement" | "other";
  uploadedAt: string;
  fileName: string;
}

export interface Alert {
  id: string;
  businessId: string;
  type: "deadline" | "threshold" | "missing_receipt";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}

export interface YearSummary {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
  byCategory: { categoryId: string; total: number }[];
  taxProfileSnapshot?: EligibilityResult;
  packs: FilingPack[];
}

export interface KnowledgeArticle {
  id: string;
  slug: string;
  title: string;
  language: "en" | "pidgin";
  tags: string[];
  content: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  description: string;
  features: string[];
}

export interface PlanFeatures {
  canGenerateYearEndPack: boolean;
  canShareWithAccountant: boolean;
  canEnableAdvancedReminders: boolean;
}

export interface FilingPack {
  id: string;
  businessId: string;
  taxYear: number;
  createdAt: string;
  createdByUserId: string;
  status: "ready" | "failed";
  pdfUrl: string | null;
  csvUrl: string | null;
  metadataJson?: Record<string, any> | null;
}

export interface FirsReadyStatus {
  businessId: string;
  taxYear: number;
  score: number;
  band: "low" | "medium" | "high";
  label: string;
  message: string;
}

export type RecommendedActionType =
  | "ADD_RECORDS_FOR_MISSING_MONTHS"
  | "UPLOAD_RECEIPTS_FOR_HIGH_VALUE"
  | "RUN_ELIGIBILITY_CHECK"
  | "GENERATE_YEAR_END_PACK"
  | "MARK_OBLIGATION_FILED"
  | "ENABLE_DEADLINE_REMINDERS"
  | "READ_EDUCATION_ARTICLE";

export type RecommendedActionVisibility = "available" | "locked";

export interface RecommendedAction {
  id: string;
  type: RecommendedActionType;
  label: string;
  description: string;
  ctaLabel: string;
  targetRoute: string;
  priority: number;
  visibility: RecommendedActionVisibility;
  requiredPlan?: PlanId;
  meta?: Record<string, any>;
}



