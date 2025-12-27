import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FilingPackBuilder } from './filing-pack.builder';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { renderFilingPackReadyEmail, renderFilingPackReadySms } from '../notifications/templates/filing-pack-ready.template';

interface FilingPackJob {
  filingPackId: string;
  businessId: string;
  taxYear: number;
  userId: string;
}

@Injectable()
@Processor('filing-pack')
export class FilingPackWorker {
  private readonly logger = new Logger(FilingPackWorker.name);

  constructor(
    private prisma: PrismaService,
    private builder: FilingPackBuilder,
    private storageService: StorageService,
    private auditService: AuditService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  @Process('generate')
  async handleGenerate(job: Job<FilingPackJob>) {
    const { filingPackId, businessId, taxYear, userId } = job.data;
    const startTime = Date.now();

    this.logger.log(`Starting pack generation for ${filingPackId}`);

    try {
      // Update status to generating
      await this.prisma.filingPack.update({
        where: { id: filingPackId },
        data: { status: 'generating' },
      });

      await this.auditService.createAuditEvent({
        businessId,
        actorUserId: userId,
        action: 'filing_pack.generate.start',
        entityType: 'FilingPack',
        entityId: filingPackId,
        metaJson: { taxYear },
      });

      // Build summary
      const summary = await this.builder.buildPackSummary(businessId, taxYear);

      // Generate PDF
      const pdfBuffer = await this.builder.buildPDF(summary);
      const pdfKey = `businesses/${businessId}/filing-packs/${taxYear}/v${summary.year}/summary.pdf`;
      await this.storageService.uploadFile(pdfBuffer, pdfKey, 'application/pdf');

      // Create PDF document record
      const pdfDocument = await this.prisma.document.create({
        data: {
          businessId,
          type: 'filing_pack_pdf',
          storageUrl: pdfKey,
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
        },
      });

      // Generate CSV
      const csvBuffer = await this.builder.buildCSV(businessId, taxYear);
      const csvKey = `businesses/${businessId}/filing-packs/${taxYear}/v${summary.year}/transactions.csv`;
      await this.storageService.uploadFile(csvBuffer, csvKey, 'text/csv');

      // Create CSV document record
      const csvDocument = await this.prisma.document.create({
        data: {
          businessId,
          type: 'filing_pack_csv',
          storageUrl: csvKey,
          mimeType: 'text/csv',
          size: csvBuffer.length,
        },
      });

      // Generate ZIP
      const zipBuffer = await this.builder.buildZIP(businessId, taxYear, pdfBuffer, csvBuffer);
      const zipKey = `businesses/${businessId}/filing-packs/${taxYear}/v${summary.year}/filing-pack.zip`;
      await this.storageService.uploadFile(zipBuffer, zipKey, 'application/zip');

      // Create ZIP document record
      const zipDocument = await this.prisma.document.create({
        data: {
          businessId,
          type: 'filing_pack_zip',
          storageUrl: zipKey,
          mimeType: 'application/zip',
          size: zipBuffer.length,
        },
      });

      // Get transactions and documents for pack items
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

      const [transactions, documents] = await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            businessId,
            date: { gte: startDate, lte: endDate },
            classification: 'business',
          },
          select: { id: true },
        }),
        this.prisma.document.findMany({
          where: {
            businessId,
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { id: true },
        }),
      ]);

      // Create pack items
      const packItems = [
        ...transactions.map((t) => ({
          filingPackId,
          kind: 'transaction',
          refId: t.id,
        })),
        ...documents.map((d) => ({
          filingPackId,
          kind: 'document',
          refId: d.id,
        })),
        {
          filingPackId,
          kind: 'summary',
          refId: filingPackId,
          metaJson: summary as any,
        },
      ];

      await this.prisma.filingPackItem.createMany({
        data: packItems as any,
      });

      // Update pack with document IDs and summary
      await this.prisma.filingPack.update({
        where: { id: filingPackId },
        data: {
          status: 'ready',
          completedAt: new Date(),
          pdfDocumentId: pdfDocument.id,
          csvDocumentId: csvDocument.id,
          zipDocumentId: zipDocument.id,
          summaryJson: summary as any,
        },
      });

      // Send filing pack ready notifications
      try {
        const business = await this.prisma.business.findUnique({
          where: { id: businessId },
          include: { owner: true },
        });
        if (!business) return;
        const preferences = await this.prisma.notificationPreference.findMany({
          where: {
            businessId,
            userId: userId,
            enabled: true,
            channel: { in: ['email', 'sms', 'in_app'] },
          },
        });

        const dedupeKey = `filing_pack_ready_${filingPackId}`;
        const packUrl = `/app/summary`; // Frontend URL

        for (const pref of preferences) {
          if (pref.channel === 'in_app') {
            await this.notificationsService.createNotificationEvent({
              businessId,
              userId,
              type: 'filing_pack_ready',
              channel: 'in_app',
              bodyPreview: `Your ${taxYear} filing pack is ready for download`,
              metaJson: { packId: filingPackId, taxYear, dedupeKey },
              dedupeKey,
            });
          } else if (pref.channel === 'email' && business.owner.email) {
            const template = renderFilingPackReadyEmail({
              businessName: business.name,
              taxYear,
              packUrl,
            });

            await this.notificationsService.createNotificationEvent({
              businessId,
              userId,
              type: 'filing_pack_ready',
              channel: 'email',
              to: business.owner.email,
              subject: template.subject,
              bodyPreview: template.html,
              metaJson: { packId: filingPackId, taxYear, dedupeKey },
              dedupeKey,
            });
          } else if (pref.channel === 'sms' && business.owner.phone) {
            const text = renderFilingPackReadySms({
              businessName: business.name,
              taxYear,
            });

            await this.notificationsService.createNotificationEvent({
              businessId,
              userId,
              type: 'filing_pack_ready',
              channel: 'sms',
              to: business.owner.phone,
              bodyPreview: text,
              metaJson: { packId: filingPackId, taxYear, dedupeKey },
              dedupeKey,
            });
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to send filing pack ready notifications: ${error.message}`);
      }

      const duration = Date.now() - startTime;

      await this.auditService.createAuditEvent({
        businessId,
        actorUserId: userId,
        action: 'filing_pack.generate.success',
        entityType: 'FilingPack',
        entityId: filingPackId,
        metaJson: {
          taxYear,
          duration,
          transactionsCount: transactions.length,
          documentsCount: documents.length,
        },
      });

      this.logger.log(`Pack generation completed for ${filingPackId} in ${duration}ms`);
    } catch (error: any) {
      this.logger.error(`Pack generation failed for ${filingPackId}: ${error.message}`, error.stack);

      await this.prisma.filingPack.update({
        where: { id: filingPackId },
        data: {
          status: 'failed',
          errorMessage: error.message || 'Unknown error',
        },
      });

      await this.auditService.createAuditEvent({
        businessId,
        actorUserId: userId,
        action: 'filing_pack.generate.fail',
        entityType: 'FilingPack',
        entityId: filingPackId,
        metaJson: {
          taxYear,
          error: error.message,
        },
      });

      throw error;
    }
  }
}

