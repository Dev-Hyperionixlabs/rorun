import { PlanId } from '../plans/plan.types';

export type RecommendedActionType =
  | 'ADD_RECORDS_FOR_MISSING_MONTHS'
  | 'UPLOAD_RECEIPTS_FOR_HIGH_VALUE'
  | 'RUN_ELIGIBILITY_CHECK'
  | 'GENERATE_YEAR_END_PACK'
  | 'MARK_OBLIGATION_FILED'
  | 'ENABLE_DEADLINE_REMINDERS'
  | 'READ_EDUCATION_ARTICLE';

export type RecommendedActionVisibility = 'available' | 'locked';

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
