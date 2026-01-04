import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { ReviewDetectors } from './review.detectors';

@Injectable()
export class ReviewService {
  private detectors: ReviewDetectors;

  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {
    this.detectors = new ReviewDetectors(this.prisma);
  }

  async listIssues(
    businessId: string,
    userId: string,
    taxYear: number,
    filters?: { status?: string; type?: string },
  ) {
    await this.businessesService.findOne(businessId, userId);
    return this.prisma.reviewIssue.findMany({
      where: {
        businessId,
        taxYear,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
      },
      orderBy: [{ severity: 'desc' as any }, { createdAt: 'desc' }],
    });
  }

  async getIssueCounts(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);
    const [open, resolved, dismissed] = await Promise.all([
      this.prisma.reviewIssue.count({ where: { businessId, taxYear, status: 'open' } }),
      this.prisma.reviewIssue.count({ where: { businessId, taxYear, status: 'resolved' } }),
      this.prisma.reviewIssue.count({ where: { businessId, taxYear, status: 'dismissed' } }),
    ]);
    return { open, resolved, dismissed };
  }

  async getIssueWithDetails(businessId: string, userId: string, issueId: string) {
    await this.businessesService.findOne(businessId, userId);
    const issue = await this.prisma.reviewIssue.findUnique({ where: { id: issueId } });
    if (!issue || issue.businessId !== businessId) {
      throw new NotFoundException('Issue not found');
    }

    const meta: any = issue.metaJson || {};
    let transactions: any[] | undefined;
    let tasks: any[] | undefined;

    if (issue.entityType === 'Transaction' && Array.isArray(meta.transactionIds)) {
      transactions = await this.prisma.transaction.findMany({
        where: { id: { in: meta.transactionIds }, businessId },
        orderBy: { date: 'desc' },
        include: { category: true },
      });
    }

    if (issue.entityType === 'ComplianceTask' && Array.isArray(meta.taskIds)) {
      tasks = await this.prisma.complianceTask.findMany({
        where: { id: { in: meta.taskIds }, businessId },
        orderBy: { dueDate: 'asc' },
        include: { evidenceLinks: true },
      });
    }

    return { issue, transactions, tasks };
  }

  async dismissIssue(businessId: string, userId: string, issueId: string) {
    await this.businessesService.findOne(businessId, userId);
    const issue = await this.prisma.reviewIssue.findUnique({ where: { id: issueId } });
    if (!issue || issue.businessId !== businessId) {
      throw new NotFoundException('Issue not found');
    }
    return this.prisma.reviewIssue.update({
      where: { id: issueId },
      data: { status: 'dismissed' },
    });
  }

  async resolveIssue(businessId: string, userId: string, issueId: string) {
    await this.businessesService.findOne(businessId, userId);
    const issue = await this.prisma.reviewIssue.findUnique({ where: { id: issueId } });
    if (!issue || issue.businessId !== businessId) {
      throw new NotFoundException('Issue not found');
    }
    return this.prisma.reviewIssue.update({
      where: { id: issueId },
      data: { status: 'resolved' },
    });
  }

  async rescan(businessId: string, userId: string, taxYear: number) {
    await this.businessesService.findOne(businessId, userId);
    return this.rescanInternal(businessId, taxYear);
  }

  async rescanInternal(businessId: string, taxYear: number) {
    const detected = await this.detectors.detectAll(businessId, taxYear);

    // Upsert detected issues, keep dismissed as dismissed
    const existing = await this.prisma.reviewIssue.findMany({
      where: { businessId, taxYear },
    });

    const seenKeys = new Set<string>();
    for (const d of detected) {
      const key = `${d.type}::${d.dedupeKey}`;
      seenKeys.add(key);

      const prev = existing.find((e) => e.type === d.type && e.dedupeKey === d.dedupeKey);
      const prevStatus = prev?.status;

      await this.prisma.reviewIssue.upsert({
        where: {
          businessId_taxYear_type_dedupeKey: {
            businessId,
            taxYear,
            type: d.type,
            dedupeKey: d.dedupeKey,
          },
        },
        create: {
          businessId,
          taxYear,
          type: d.type,
          severity: d.severity,
          status: 'open',
          dedupeKey: d.dedupeKey,
          title: d.title,
          description: d.description,
          entityType: d.entityType || null,
          entityId: d.entityId || null,
          metaJson: d.metaJson || null,
        },
        update: {
          severity: d.severity,
          title: d.title,
          description: d.description,
          entityType: d.entityType || null,
          entityId: d.entityId || null,
          metaJson: d.metaJson || null,
          status: prevStatus === 'dismissed' ? 'dismissed' : 'open',
        },
      });
    }

    // Mark previously-open issues as resolved if no longer detected (do not touch dismissed)
    for (const e of existing) {
      const key = `${e.type}::${e.dedupeKey}`;
      if (!seenKeys.has(key) && e.status !== 'dismissed') {
        await this.prisma.reviewIssue.update({
          where: { id: e.id },
          data: { status: 'resolved' },
        });
      }
    }

    return { detectedCount: detected.length };
  }

  async upsertOverrideAndMaterialize(
    businessId: string,
    userId: string,
    transactionId: string,
    patch: { classification?: 'business' | 'personal' | 'unknown'; categoryId?: string | null; note?: string | null },
  ) {
    await this.businessesService.findOne(businessId, userId);

    const tx = await this.prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.businessId !== businessId) {
      throw new NotFoundException('Transaction not found');
    }

    const override = await this.prisma.transactionOverride.upsert({
      where: { transactionId },
      create: {
        businessId,
        transactionId,
        setByUserId: userId,
        classification: patch.classification ?? null,
        categoryId: patch.categoryId === undefined ? null : patch.categoryId,
        note: patch.note ?? null,
      },
      update: {
        setByUserId: userId,
        classification: patch.classification ?? undefined,
        categoryId: patch.categoryId === undefined ? undefined : patch.categoryId,
        note: patch.note ?? undefined,
        createdAt: new Date(),
      },
    });

    // Materialize into transactions table for fast reads (packs/wizard)
    const nextClassification = patch.classification ?? tx.classification;
    const nextIsBusinessFlag = nextClassification === 'business' ? true : nextClassification === 'personal' ? false : false;

    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(patch.classification ? { classification: patch.classification, isBusinessFlag: nextIsBusinessFlag } : {}),
        ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId, categoryConfidence: patch.categoryId ? 1 : null } : {}),
      },
    });

    return override;
  }

  async bulkClassify(
    businessId: string,
    userId: string,
    transactionIds: string[],
    classification: 'business' | 'personal' | 'unknown',
  ) {
    await this.businessesService.findOne(businessId, userId);
    const nextIsBusinessFlag = classification === 'business' ? true : classification === 'personal' ? false : false;

    for (const id of transactionIds) {
      await this.upsertOverrideAndMaterialize(businessId, userId, id, { classification });
    }

    return { updated: transactionIds.length };
  }

  async bulkCategorize(businessId: string, userId: string, transactionIds: string[], categoryId: string | null) {
    await this.businessesService.findOne(businessId, userId);
    for (const id of transactionIds) {
      await this.upsertOverrideAndMaterialize(businessId, userId, id, { categoryId });
    }
    return { updated: transactionIds.length };
  }
}


