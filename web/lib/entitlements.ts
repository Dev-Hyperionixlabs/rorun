export type PlanId = "free" | "basic" | "business" | "accountant";

export type FeatureKey =
  | "yearEndFilingPack"
  | "exportTransactions"
  | "bank_connect";

const ENTITLEMENTS: Record<PlanId, Record<FeatureKey, boolean>> = {
  free: {
    yearEndFilingPack: false,
    exportTransactions: false,
    bank_connect: false,
  },
  basic: {
    yearEndFilingPack: true,
    exportTransactions: true,
    bank_connect: false,
  },
  business: {
    yearEndFilingPack: true,
    exportTransactions: true,
    bank_connect: true,
  },
  accountant: {
    yearEndFilingPack: true,
    exportTransactions: true,
    bank_connect: true,
  },
};

export function canAccess(plan: PlanId | string | null | undefined, feature: FeatureKey): boolean {
  const id = (String(plan || "free").toLowerCase() as PlanId) || "free";
  return ENTITLEMENTS[id]?.[feature] ?? false;
}


