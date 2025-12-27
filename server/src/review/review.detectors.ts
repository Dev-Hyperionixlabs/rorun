import { PrismaService } from '../prisma/prisma.service';

export type ReviewIssueType =
  | 'uncategorized'
  | 'unknown_classification'
  | 'missing_month'
  | 'missing_evidence'
  | 'possible_duplicate';

export interface DetectorIssue {
  type: ReviewIssueType;
  severity: 'low' | 'medium' | 'high';
  dedupeKey: string;
  title: string;
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  metaJson?: any;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeDescription(desc?: string | null): string {
  if (!desc) return '';
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ReviewDetectors {
  constructor(private prisma: PrismaService) {}

  async detectAll(businessId: string, taxYear: number): Promise<DetectorIssue[]> {
    const issues: DetectorIssue[] = [];

    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    const [transactions, tasks] = await Promise.all([
      (this.prisma as any).transaction.findMany({
        where: {
          businessId,
          date: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          date: true,
          amount: true,
          description: true,
          categoryId: true,
          classification: true,
          providerTxnId: true,
          importFingerprint: true,
        },
      }) as Promise<any[]>,
      (this.prisma as any).complianceTask.findMany({
        where: {
          businessId,
          taxYear,
          evidenceRequired: true,
          status: { in: ['open', 'overdue', 'in_progress'] },
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          evidenceLinks: { select: { id: true } },
        },
      }) as Promise<any[]>,
    ]);

    // 1) Uncategorized transactions (categoryId null)
    const uncategorized = transactions.filter((t) => !t.categoryId);
    if (uncategorized.length > 0) {
      issues.push({
        type: 'uncategorized',
        severity: uncategorized.length >= 25 ? 'high' : uncategorized.length >= 10 ? 'medium' : 'low',
        dedupeKey: `uncategorized_${taxYear}`,
        title: 'Uncategorized transactions',
        description: 'Some transactions are missing a category. Categorise them to improve reports and filing readiness.',
        entityType: 'Transaction',
        metaJson: {
          transactionIds: uncategorized.map((t) => t.id),
          count: uncategorized.length,
        },
      });
    }

    // 2) Unknown classification
    const unknownClassified = transactions.filter((t) => (t.classification || 'unknown') === 'unknown');
    if (unknownClassified.length > 0) {
      issues.push({
        type: 'unknown_classification',
        severity:
          unknownClassified.length >= 25 ? 'high' : unknownClassified.length >= 10 ? 'medium' : 'low',
        dedupeKey: `unknown_classification_${taxYear}`,
        title: 'Business vs personal not confirmed',
        description: 'Some transactions are not confirmed as business or personal. Please review them.',
        entityType: 'Transaction',
        metaJson: {
          transactionIds: unknownClassified.map((t) => t.id),
          count: unknownClassified.length,
        },
      });
    }

    // 3) Missing months (prefer business-classified transactions if any exist)
    const businessTx = transactions.filter((t) => t.classification === 'business');
    const baseForMonths = businessTx.length > 0 ? businessTx : transactions;
    const monthsCovered = new Set(baseForMonths.map((t) => monthKey(t.date)));
    const missingMonths: string[] = [];
    for (let m = 0; m < 12; m++) {
      const mk = `${taxYear}-${String(m + 1).padStart(2, '0')}`;
      if (!monthsCovered.has(mk)) missingMonths.push(mk);
    }
    if (missingMonths.length > 0) {
      issues.push({
        type: 'missing_month',
        severity: missingMonths.length >= 4 ? 'high' : missingMonths.length >= 2 ? 'medium' : 'low',
        dedupeKey: `missing_month_${taxYear}`,
        title: 'Missing months of transactions',
        description: 'Some months have no transactions recorded. Import statements or add missing records.',
        metaJson: { missingMonths, count: missingMonths.length },
      });
    }

    // 4) Missing evidence for tasks
    const missingEvidence = tasks.filter((t) => (t.evidenceLinks?.length || 0) === 0);
    if (missingEvidence.length > 0) {
      issues.push({
        type: 'missing_evidence',
        severity: missingEvidence.length >= 10 ? 'high' : missingEvidence.length >= 4 ? 'medium' : 'low',
        dedupeKey: `missing_evidence_${taxYear}`,
        title: 'Missing evidence for tasks',
        description: 'Some compliance tasks require evidence but no document is attached.',
        entityType: 'ComplianceTask',
        metaJson: { taskIds: missingEvidence.map((t) => t.id), count: missingEvidence.length },
      });
    }

    // 5) Possible duplicates (deterministic heuristic)
    // - exact providerTxnId duplicates (if present)
    // - else: same date + same amount + same normalized description
    const pairs: Array<{ a: string; b: string; reason: string }> = [];

    const byProviderTxnId = new Map<string, string[]>();
    for (const t of transactions) {
      if (!t.providerTxnId) continue;
      const k = t.providerTxnId;
      byProviderTxnId.set(k, [...(byProviderTxnId.get(k) || []), t.id]);
    }
    for (const [k, ids] of byProviderTxnId.entries()) {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          pairs.push({ a: ids[i], b: ids[i + 1], reason: `Same providerTxnId: ${k}` });
        }
      }
    }

    const byHeuristic = new Map<string, string[]>();
    for (const t of transactions) {
      const dKey = monthKey(t.date) + '-' + String(t.date.getDate()).padStart(2, '0');
      const amt = Number(t.amount);
      const desc = normalizeDescription(t.description);
      if (!desc || !Number.isFinite(amt)) continue;
      const key = `${dKey}|${amt}|${desc}`;
      byHeuristic.set(key, [...(byHeuristic.get(key) || []), t.id]);
    }
    for (const [k, ids] of byHeuristic.entries()) {
      if (ids.length > 1) {
        for (let i = 0; i < ids.length - 1; i++) {
          pairs.push({ a: ids[i], b: ids[i + 1], reason: `Same date/amount/description: ${k}` });
        }
      }
    }

    if (pairs.length > 0) {
      issues.push({
        type: 'possible_duplicate',
        severity: pairs.length >= 10 ? 'high' : pairs.length >= 4 ? 'medium' : 'low',
        dedupeKey: `possible_duplicate_${taxYear}`,
        title: 'Possible duplicate transactions',
        description: 'Some transactions look like duplicates. Review before filing.',
        entityType: 'Transaction',
        metaJson: { pairs, count: pairs.length },
      });
    }

    return issues;
  }
}


