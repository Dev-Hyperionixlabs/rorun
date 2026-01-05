import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditService } from '../audit/audit.service';
import { AiService } from '../ai/ai.service';
import { StorageService } from '../storage/storage.service';
import { CreateImportDto, ApproveImportDto } from './dto/import.dto';
import { parseCsv, parsePaste } from './import-parser';
import * as crypto from 'crypto';

// pdf-parse is optional at runtime (used as a best-effort fallback). We load it lazily.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getPdfParse = (): any => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('pdf-parse');
  } catch {
    return null;
  }
};

@Injectable()
export class ImportsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private transactionsService: TransactionsService,
    private auditService: AuditService,
    private aiService: AiService,
    private storageService: StorageService,
  ) {}

  async createImport(businessId: string, userId: string, dto: CreateImportDto) {
    await this.businessesService.findOne(businessId, userId);

    // Validate inputs early so we don't produce Prisma 500s.
    if (dto.sourceType === 'paste' && !dto.rawText?.trim()) {
      throw new BadRequestException({ code: 'IMPORT_RAW_TEXT_REQUIRED', message: 'rawText is required for paste imports' });
    }
    if (dto.sourceType === 'csv' && !dto.rawText?.trim() && !dto.documentId) {
      throw new BadRequestException({
        code: 'IMPORT_CSV_REQUIRED',
        message: 'For CSV imports, provide rawText CSV content (recommended) or a documentId.',
      });
    }
    if (dto.sourceType === 'pdf' && !dto.documentId) {
      throw new BadRequestException({
        code: 'IMPORT_PDF_DOCUMENT_REQUIRED',
        message: 'documentId is required for PDF imports.',
      });
    }

    // If a documentId is provided, ensure it exists and belongs to this business to avoid FK 500s.
    if (dto.documentId) {
      const doc = await this.prisma.document.findFirst({
        where: { id: dto.documentId, businessId },
        select: { id: true },
      });
      if (!doc) {
        throw new NotFoundException('Document not found for this business');
      }
    }

    const batch = await this.prisma.importBatch.create({
      data: {
        businessId,
        documentId: dto.documentId || null,
        source: 'statement',
        // We can parse paste/csv immediately; pdf is async.
        status: dto.sourceType === 'pdf' ? 'processing' : 'pending',
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
    } else if (dto.sourceType === 'csv') {
      // CSV can be provided as rawText (normalized by the client) OR as an uploaded Document.
      if (dto.rawText) {
        await this.parseCsvText(batch.id, dto.rawText, businessId);
      } else if (dto.documentId) {
        // Parse from document storage
        const doc = await this.prisma.document.findFirst({
          where: { id: dto.documentId, businessId },
          select: { storageUrl: true, mimeType: true },
        });
        if (!doc) throw new NotFoundException('Document not found');
        const { buffer } = await this.storageService.getObjectBuffer(doc.storageUrl);
        const text = buffer.toString('utf-8');
        await this.parseCsvText(batch.id, text, businessId);
      }
    } else if (dto.sourceType === 'pdf' && dto.documentId) {
      // Best-effort: PDF parsing is async via AiService (OCR/extraction).
      // Client will call /parse and poll /:id until lines exist or status=failed.
    }

    return batch;
  }

  async parseImport(batchId: string, businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    const batch = await this.prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { lines: true, document: true },
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

    // PDF statement parsing (best-effort):
    // - Trigger AiService processing for the associated Document
    // - If extracted metadata includes transactions, convert to ImportBatchLine rows
    if (batch.document && batch.document.mimeType === 'application/pdf') {
      // Ensure document OCR runs (AiService is best-effort and updates extractedMetadataJson)
      try {
        await this.aiService.processDocument(batch.document.id);
      } catch {
        // ignore; we'll fall back to empty state
      }

      const doc = await this.prisma.document.findUnique({
        where: { id: batch.document.id },
        select: { extractedMetadataJson: true, ocrStatus: true },
      });

      const meta: any = (doc as any)?.extractedMetadataJson || null;
      const candidates: any[] =
        (Array.isArray(meta?.transactions) ? meta.transactions : null) ||
        (Array.isArray(meta?.lines) ? meta.lines : null) ||
        [];

      if (!candidates.length) {
        // Fallback: try direct text extraction from the PDF bytes (no external OCR service).
        // This is best-effort and works for many bank statement PDFs that contain selectable text.
        try {
          const { buffer: pdfBuf } = await this.storageService.getObjectBuffer(batch.document.storageUrl);
          const pdfParse = getPdfParse();
          const parsed = pdfParse ? await pdfParse(pdfBuf).catch(() => null) : null;
          const text = (parsed as any)?.text ? String((parsed as any).text) : '';
          const extractedLines = text ? parsePaste(text) : [];
          if (extractedLines.length > 0) {
            await this.createBatchLines(batchId, extractedLines, businessId);
            await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'parsed' } }).catch(() => {});
            return this.prisma.importBatch.findUnique({
              where: { id: batchId },
              include: { lines: true, document: true },
            });
          }
        } catch {
          // ignore
        }

        // Still processing or unsupported PDF format
        await this.prisma.importBatch
          .update({
            where: { id: batchId },
            data: { status: (doc as any)?.ocrStatus === 'failed' ? 'failed' : 'processing' },
          })
          .catch(() => {});
        return batch;
      }

      const toDate = (v: any) => {
        const d = v ? new Date(v) : null;
        return d && !Number.isNaN(d.getTime()) ? d : null;
      };
      const toAmount = (v: any) => {
        const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[,\s₦$]/g, ''));
        return Number.isFinite(n) ? n : null;
      };

      const rows = candidates
        .map((t) => {
          const date = toDate(t.date || t.transactionDate || t.postedAt);
          const amount = toAmount(t.amount || t.value);
          const desc = String(t.description || t.narration || t.details || '').trim() || null;
          const dirRaw = String(t.direction || t.type || '').toLowerCase();
          const direction =
            dirRaw === 'credit' || dirRaw === 'cr' || dirRaw === 'income'
              ? 'credit'
              : dirRaw === 'debit' || dirRaw === 'dr' || dirRaw === 'expense'
                ? 'debit'
                : amount != null && amount >= 0
                  ? 'credit'
                  : 'debit';
          if (!date || amount == null) return null;
          return { date, amount: Math.abs(amount), description: desc, direction };
        })
        .filter(Boolean) as Array<{ date: Date; amount: number; description: string | null; direction: string }>;

      if (!rows.length) {
        await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'failed' } }).catch(() => {});
        return batch;
      }

      await this.createBatchLines(
        batchId,
        rows.map((r) => ({ ...r, confidence: 0.75, direction: r.direction as 'credit' | 'debit' })),
        businessId,
      );
      await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'parsed' } }).catch(() => {});

      return this.prisma.importBatch.findUnique({
        where: { id: batchId },
        include: { lines: true, document: true },
      });
    }

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
    await this.createBatchLines(batchId, parsedLines, businessId);
    await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'parsed' } }).catch(() => {});
    return true;
  }

  private async parseCsvText(batchId: string, csvText: string, businessId: string) {
    const parsedLines = parseCsv(csvText);
    if (!parsedLines.length) {
      await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'failed' } }).catch(() => {});
      return false;
    }
    await this.createBatchLines(batchId, parsedLines, businessId);
    await this.prisma.importBatch.update({ where: { id: batchId }, data: { status: 'parsed' } }).catch(() => {});
    return true;
  }

  private async createBatchLines(
    batchId: string,
    parsedLines: Array<{ date: Date; description: string; amount: number; direction: 'credit' | 'debit'; confidence: number }>,
    businessId: string,
  ) {
    // Get categories for suggestions (global list)
    const categories = await this.prisma.transactionCategory.findMany({});
    await this.prisma.importBatchLine.deleteMany({ where: { importBatchId: batchId } }).catch(() => {});
    await this.prisma.importBatchLine.createMany({
      data: parsedLines.slice(0, 2000).map((line) => ({
        importBatchId: batchId,
        date: line.date,
        description: line.description,
        amount: line.amount,
        direction: line.direction,
        suggestedCategoryId: this.suggestCategory(line.description, categories),
        aiConfidence: line.confidence,
      })),
    });
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

