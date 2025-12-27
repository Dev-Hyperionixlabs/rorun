import { api } from "./client";

export interface FilingRunAnswers {
  incomeAdjustments?: number;
  expenseAdjustments?: number;
  incomeAdjustmentNote?: string;
  expenseAdjustmentNote?: string;
}

export interface FilingRunComputed {
  incomeTotal: number;
  expenseTotal: number;
  profitEstimate: number;
  monthsCovered: number;
  missingMonths: string[];
  evidenceCoverage: {
    receiptsCount: number;
    transactionsCount: number;
    coverageRatio: number;
  };
  flags: {
    missingMonths: boolean;
    lowEvidenceCoverage: boolean;
    turnoverThresholdWatch: boolean;
  };
}

export interface FilingRun {
  id: string;
  businessId: string;
  taxYear: number;
  kind: string;
  status: "in_progress" | "ready" | "submitted" | "abandoned";
  currentStep: string;
  answersJson: FilingRunAnswers;
  computedJson: FilingRunComputed | null;
  lastViewedAt: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export async function startFilingWizard(
  businessId: string,
  taxYear: number,
  kind: string = "annual_return_prep"
): Promise<FilingRun> {
  return api.post(`/businesses/${businessId}/filing-wizard/start`, {
    taxYear,
    kind,
  });
}

export async function getFilingRun(
  businessId: string,
  taxYear: number,
  kind: string = "annual_return_prep"
): Promise<FilingRun> {
  return api.get(
    `/businesses/${businessId}/filing-wizard/run?taxYear=${taxYear}&kind=${kind}`
  );
}

export async function updateFilingWizardStep(
  businessId: string,
  taxYear: number,
  kind: string,
  step: string,
  answersPatch: Partial<FilingRunAnswers>
): Promise<FilingRun> {
  return api.post(`/businesses/${businessId}/filing-wizard/step`, {
    taxYear,
    kind,
    step,
    answersPatch,
  });
}

export async function completeFilingWizard(
  businessId: string,
  taxYear: number,
  kind: string = "annual_return_prep"
): Promise<{ run: FilingRun; filingPackQueued: boolean }> {
  return api.post(`/businesses/${businessId}/filing-wizard/complete`, {
    taxYear,
    kind,
  });
}

