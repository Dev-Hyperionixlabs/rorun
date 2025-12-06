export type PlanId = 'free' | 'basic' | 'business' | 'accountant';

export type PlanFeatureKey =
  | 'taxStatusCheck'
  | 'firsReadyDashboard'
  | 'basicBookkeeping'
  | 'standardAlerts'
  | 'educationHub'
  | 'yearEndFilingPack'
  | 'exportTransactions'
  | 'emailSupport'
  | 'advancedReminders'
  | 'multiUserAccess'
  | 'enhancedSummaryReports'
  | 'multiWorkspaceView'
  | 'prioritySupport';

export type PlanFeatures = Record<PlanFeatureKey, boolean>;

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

export const planFeaturesMap: Record<PlanId, PlanFeatures> = {
  free: {
    ...baseFree,
  },
  basic: {
    ...baseFree,
    yearEndFilingPack: true,
    exportTransactions: true,
    emailSupport: true,
  },
  business: {
    ...baseFree,
    yearEndFilingPack: true,
    exportTransactions: true,
    emailSupport: true,
    advancedReminders: true,
    multiUserAccess: true,
    enhancedSummaryReports: true,
  },
  accountant: {
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
};

export function getPlanFeatures(planId?: string): PlanFeatures {
  const safeId = (planId?.toLowerCase?.() as PlanId) ?? 'free';
  return planFeaturesMap[safeId] ?? planFeaturesMap.free;
}

export function planHasFeature(planId: PlanId, feature: PlanFeatureKey): boolean {
  return getPlanFeatures(planId)[feature] ?? false;
}
