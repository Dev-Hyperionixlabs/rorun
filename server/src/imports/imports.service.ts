import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditService } from '../audit/audit.service';
import { CreateImportDto, ApproveImportDto } from './dto/import.dto';
import { parseCsv, parsePaste } from './import-parser';
import * as crypto from 'crypto';

@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private transactionsService: TransactionsService,
    private auditService: AuditService,
  ) {}

  async createImport(businessId: string, userId: string, dto: CreateImportDto) {
    await this.businessesService.findOne(businessId, userId);

    const batch = await this.prisma.importBatch.create({
      data: {
        businessId,
        documentId: dto.documentId || null,
        source: 'statement',
        status: 'pending',
      },
    });

    // Create audit event
    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'import.create',
      entityType: 'ImportBatch',
      entityId: batch.id,
    });

    // Parse based on source type
    if (dto.sourceType === 'paste' && dto.rawText) {
      await this.parsePasteText(batch.id, dto.rawText, businessId);
    } else if (dto.sourceType === 'csv' && dto.documentId) {
      // CSV parsing would read from document storage
      // For now, mark as processing - actual parsing would happen in a job
      await this.prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: 'processing' },
      });
    }

    return batch;
  }

  async parseImport(batchId: string, businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { lines: true },
    });

    if (!batch || batch.businessId !== businessId) {
      throw new NotFoundException('Import batch not found');
    }

    if (batch.status === 'completed') {
      return batch;
    }

    // If already has lines, return them
    if (batch.lines.length > 0) {
      return batch;
    }

    // Parse based on document or raw text
    // For now, if it's a paste import, parsing happens in createImport
    // CSV would be parsed here from document storage

    return batch;
  }

  async getImport(batchId: string, businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        lines: {
          orderBy: { date: 'desc' },
        },
        document: true,
      },
    });

    if (!batch || batch.businessId !== businessId) {
      throw new NotFoundException('Import batch not found');
    }

    return batch;
  }

  async approveImport(
    batchId: string,
    businessId: string,
    userId: string,
    dto: ApproveImportDto,
  ) {
    await this.businessesService.findOne(businessId, userId);

    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { lines: true },
    });

    if (!batch || batch.businessId !== businessId) {
      throw new NotFoundException('Import batch not found');
    }

    if (batch.status === 'approved' || batch.status === 'completed') {
      throw new BadRequestException('Import batch already approved');
    }

    // Get selected lines (or all if none specified)
    const selectedLines = dto.lineIds && dto.lineIds.length > 0
      ? batch.lines.filter((line) => dto.lineIds.includes(line.id))
      : batch.lines;

    if (selectedLines.length === 0) {
      throw new BadRequestException('No lines selected for approval');
    }

    // Create transactions from selected lines with deduplication
    const createdTransactions = [];
    let skippedCount = 0;

    for (const line of selectedLines) {
      // Generate fingerprint for dedup
      const normalizedDesc = (line.description || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
      const dateISO = line.date.toISOString().split('T')[0];
      const fingerprint = crypto
        .createHash('sha256')
        .update(
          `${businessId}|import|${batchId}|${dateISO}|${line.amount}|${normalizedDesc}`,
        )
        .digest('hex');

      // Check if already exists
      const existing = await this.prisma.transaction.findUnique({
        where: { importFingerprint: fingerprint },
      });

      if (existing) {
        skippedCount++;
        // Link to existing transaction
        await this.prisma.importBatchLine.update({
          where: { id: line.id },
          data: { mappedTransactionId: existing.id },
        });
        continue;
      }

      // Create transaction
      try {
        const transaction = await this.prisma.transaction.create({
          data: {
            businessId,
            type: line.direction === 'credit' ? 'income' : 'expense',
            amount: line.amount,
            currency: 'NGN',
            date: line.date,
            description: line.description || 'Imported transaction',
            source: 'import',
            importFingerprint: fingerprint,
            importBatchId: batchId,
            categoryId: line.suggestedCategoryId || undefined,
            categoryConfidence: line.aiConfidence || undefined,
            // Default to safety: imported transactions start as unknown classification
            classification: 'unknown',
            isBusinessFlag: false,
          },
        });

        createdTransactions.push(transaction);

        // Link transaction to import line
        await this.prisma.importBatchLine.update({
          where: { id: line.id },
          data: { mappedTransactionId: transaction.id },
        });
      } catch (error: any) {
        skippedCount++;
      }
    }

    // Mark batch as approved
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'approved' },
    });

    // Create audit event
    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'import.approve',
      entityType: 'ImportBatch',
      entityId: batchId,
      metaJson: {
        transactionsCreated: createdTransactions.length,
        skippedCount,
        totalLines: selectedLines.length,
      },
    });

    return {
      success: true,
      transactionsCreated: createdTransactions.length,
      skippedCount,
      batchId: batch.id,
    };
  }

  async rollbackImport(
    batchId: string,
    businessId: string,
    userId: string,
  ) {
    await this.businessesService.findOne(businessId, userId);

    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: {
        transactions: true,
      },
    });

    if (!batch || batch.businessId !== businessId) {
      throw new NotFoundException('Import batch not found');
    }

    if (batch.status === 'rolled_back') {
      throw new BadRequestException('Import batch already rolled back');
    }

    // Delete transactions linked to this batch
    const deletedCount = await this.prisma.transaction.deleteMany({
      where: {
        importBatchId: batchId,
        businessId,
      },
    });

    // Mark batch as rolled back
    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'rolled_back' },
    });

    // Create audit event
    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'import.rollback',
      entityType: 'ImportBatch',
      entityId: batchId,
      metaJson: {
        transactionsDeleted: deletedCount.count,
      },
    });

    return {
      success: true,
      transactionsDeleted: deletedCount.count,
    };
  }

  private async parsePasteText(
    batchId: string,
    rawText: string,
    businessId: string,
  ) {
    const parsedLines = parsePaste(rawText);

    // Get categories for suggestions
    const categories = await this.prisma.transactionCategory.findMany({
      // Transaction categories are global in this schema
    });

    const lines = await Promise.all(
      parsedLines.map((line, idx) =>
        this.prisma.importBatchLine.create({
          data: {
            importBatchId: batchId,
            date: line.date,
            description: line.description,
            amount: line.amount,
            direction: line.direction,
            suggestedCategoryId: this.suggestCategory(
              line.description,
              categories,
            ),
            aiConfidence: line.confidence,
          },
        }),
      ),
    );

    await this.prisma.importBatch.update({
      where: { id: batchId },
      data: { status: 'processing' },
    });

    return lines;
  }

  private suggestCategory(
    description: string,
    categories: Array<{ id: string; name: string; type: string }>,
  ): string | null {
    if (!description) return null;

    const descLower = description.toLowerCase();

    // Simple keyword matching
    for (const cat of categories) {
      const catLower = cat.name.toLowerCase();
      if (descLower.includes(catLower) || catLower.includes(descLower)) {
        return cat.id;
      }
    }

    // Common patterns
    if (descLower.includes('rent') || descLower.includes('lease')) {
      return categories.find((c) => c.name.toLowerCase().includes('rent'))?.id || null;
    }
    if (descLower.includes('fuel') || descLower.includes('petrol')) {
      return categories.find((c) => c.name.toLowerCase().includes('transport'))?.id || null;
    }

    return null;
  }
}

