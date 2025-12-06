import {
  Business,
  PlanFeatures,
  PlanId,
  RecommendedAction,
  RecommendedActionVisibility,
  Transaction,
} from "./types";
import { TaxSafetyScore } from "./tax-safety";

const DEFAULT_PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    canGenerateYearEndPack: false,
    canShareWithAccountant: false,
    canEnableAdvancedReminders: false,
  },
  basic: {
    canGenerateYearEndPack: true,
    canShareWithAccountant: false,
    canEnableAdvancedReminders: true,
  },
  business: {
    canGenerateYearEndPack: true,
    canShareWithAccountant: true,
    canEnableAdvancedReminders: true,
  },
  accountant: {
    canGenerateYearEndPack: true,
    canShareWithAccountant: true,
    canEnableAdvancedReminders: true,
  },
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function computeRecommendedActionsMock(
  business: Business,
  transactions: Transaction[],
  score: TaxSafetyScore,
  planId: PlanId = "free"
): RecommendedAction[] {
  const planFeatures = DEFAULT_PLAN_FEATURES[planId] ?? DEFAULT_PLAN_FEATURES.free;
  const actions: RecommendedAction[] = [];
  const reasons = new Set(score.reasons);
  const now = new Date();
  const monthsElapsed = Math.max(now.getMonth() + 1, 1);

  const monthSet = new Set<number>();
  transactions.forEach((t) => {
    const d = new Date(t.date);
    if (d.getFullYear() === score.taxYear) {
      monthSet.add(d.getMonth());
    }
  });
  const missingMonths = [];
  for (let m = 0; m < monthsElapsed; m++) {
    if (!monthSet.has(m)) missingMonths.push({ month: m + 1, label: monthNames[m] });
  }

  const highValueTx = transactions
    .filter(
      (t) =>
        new Date(t.date).getFullYear() === score.taxYear &&
        t.amount >= 50000 &&
        !t.hasDocument
    )
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const makeId = (type: string) =>
    `${type}-${business.id}-${score.taxYear}`;

  if (reasons.has("MISSING_ELIGIBILITY")) {
    actions.push({
      id: makeId("RUN_ELIGIBILITY_CHECK"),
      type: "RUN_ELIGIBILITY_CHECK",
      label: "Run your 2-minute tax status check",
      description: "Confirm you still qualify for 0% and see your obligations.",
      ctaLabel: "Run status check",
      targetRoute: "/onboarding",
      priority: 1,
      visibility: "available",
    });
  }

  if (reasons.has("LOW_RECORDS_COVERAGE") || reasons.has("MEDIUM_RECORDS_COVERAGE")) {
    if (missingMonths.length > 0) {
      actions.push({
        id: makeId("ADD_RECORDS_FOR_MISSING_MONTHS"),
        type: "ADD_RECORDS_FOR_MISSING_MONTHS",
        label: "Fill in missing months",
        description: `No records for ${missingMonths
          .slice(0, 3)
          .map((m) => m.label)
          .join(", ")}. Add income and expenses to cover the year.`,
        ctaLabel: "Add records",
        targetRoute: "/app/transactions?focus=missing-months",
        meta: { months: missingMonths },
        priority: 2,
        visibility: "available",
      });
    }
  }

  if (reasons.has("LOW_RECEIPT_COVERAGE") || reasons.has("MEDIUM_RECEIPT_COVERAGE")) {
    if (highValueTx.length > 0) {
      actions.push({
        id: makeId("UPLOAD_RECEIPTS_FOR_HIGH_VALUE"),
        type: "UPLOAD_RECEIPTS_FOR_HIGH_VALUE",
        label: "Attach receipts for big expenses",
        description:
          "Some of your biggest transactions don’t have receipts yet. Attach photos or PDFs so you’re covered.",
        ctaLabel: "Upload receipts",
        targetRoute: "/app/documents?filter=missing-receipts",
        meta: { transactionIds: highValueTx.map((t) => t.id) },
        priority: 3,
        visibility: "available",
      });
    }
  }

  if (reasons.has("OVERDUE_OBLIGATION")) {
    actions.push({
      id: makeId("MARK_OBLIGATION_FILED"),
      type: "MARK_OBLIGATION_FILED",
      label: "Update overdue filings",
      description:
        "You have overdue filings. If you already filed, mark them as done. If not, prepare your pack now.",
      ctaLabel: "Review overdue items",
      targetRoute: "/app/obligations?filter=overdue",
      priority: 1,
      visibility: "available",
    });
  }

  if (
    reasons.has("DEADLINE_VERY_SOON") ||
    reasons.has("DEADLINE_SOON")
  ) {
    const packAvailable = planFeatures.canGenerateYearEndPack;
    actions.push({
      id: makeId("GENERATE_YEAR_END_PACK"),
      type: "GENERATE_YEAR_END_PACK",
      label: "Generate filing pack",
      description: "Create a simple pack (PDF + CSV) you or your accountant can file.",
      ctaLabel: packAvailable ? "Generate pack" : "Upgrade to unlock",
      targetRoute: packAvailable ? "/app/summary?autoGenerate=true" : "/app/pricing",
      priority: 2,
      visibility: packAvailable ? "available" : "locked",
      requiredPlan: packAvailable ? undefined : "basic",
    });

    const remindersAvailable = planFeatures.canEnableAdvancedReminders;
    actions.push({
      id: makeId("ENABLE_DEADLINE_REMINDERS"),
      type: "ENABLE_DEADLINE_REMINDERS",
      label: "Turn on smart deadline reminders",
      description: "Get early nudges before CIT and VAT due dates.",
      ctaLabel: remindersAvailable ? "Enable reminders" : "Upgrade to unlock",
      targetRoute: remindersAvailable ? "/app/settings?tab=notifications" : "/app/pricing",
      priority: 3,
      visibility: remindersAvailable ? "available" : "locked",
      requiredPlan: remindersAvailable ? undefined : "business",
    });
  }

  if (score.score < 80) {
    actions.push({
      id: makeId("READ_EDUCATION_ARTICLE"),
      type: "READ_EDUCATION_ARTICLE",
      label: "Understand 0% tax and filing",
      description: "2-minute read: why you still need to file even when you pay 0%.",
      ctaLabel: "Read guide",
      targetRoute: "/app/education/zero-tax-explained",
      priority: 4,
      visibility: "available",
    });
  }

  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.type)) return false;
    seen.add(a.type);
    return true;
  });

  return unique.sort((a, b) => a.priority - b.priority);
}


