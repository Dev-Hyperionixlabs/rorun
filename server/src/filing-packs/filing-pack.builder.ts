import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
// NOTE: `archiver` is used only for ZIP exports. We lazy-load it to avoid boot-time
// crashes in environments where optional dependencies may not be installed.

interface PackSummary {
  year: number;
  business: {
    name: string;
    legalForm: string;
    tin?: string | null;
    cacNumber?: string | null;
  };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    estimatedProfit: number;
    transactionsCount: number;
    documentsCount: number;
    monthsCovered: number;
    receiptCoverage?: number;
  };
  taxProfile?: {
    citStatus: string;
    vatStatus: string;
    whtStatus: string;
  } | null;
  complianceTasks?: {
    total: number;
    completed: number;
  };
  nextDeadlines?: Array<{
    type: string;
    dueDate: string;
  }>;
}

@Injectable()
export class FilingPackBuilder {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
  ) {}

  async buildPackSummary(businessId: string, taxYear: number): Promise<PackSummary> {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    const [business, transactions, documents, taxProfile, complianceTasks, obligations] =
      await Promise.all([
        this.prisma.business.findUnique({
          where: { id: businessId },
        }),
        this.prisma.transaction.findMany({
          where: {
            businessId,
            date: {
              gte: startDate,
              lte: endDate,
            },
            // Only business-classified transactions are included in filing computations
            classification: 'business' as any,
          } as any,
          include: {
            category: true,
          } as any,
        }),
        this.prisma.document.findMany({
          where: {
            businessId,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        this.prisma.taxProfile.findUnique({
          where: {
            businessId_taxYear: {
              businessId,
              taxYear,
            },
          },
        }),
        (this.prisma as any).complianceTask.findMany({
          where: {
            businessId,
            taxYear,
          },
        }),
        this.prisma.obligation.findMany({
          where: {
            businessId,
            periodStart: {
              gte: startDate,
            },
            periodEnd: {
              lte: endDate,
            },
          },
        }),
      ]);

    if (!business) {
      throw new Error(`Business ${businessId} not found`);
    }

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const profit = income - expenses;

    // Calculate months covered
    const transactionMonths = new Set<number>();
    transactions.forEach((t) => {
      const d = new Date(t.date);
      transactionMonths.add(d.getMonth());
    });
    const monthsCovered = transactionMonths.size;

    // Calculate receipt coverage (documents linked to transactions)
    const documentsWithTransactions = documents.filter((d) => d.relatedTransactionId);
    const receiptCoverage =
      transactions.length > 0
        ? (documentsWithTransactions.length / transactions.length) * 100
        : 0;

    // Compliance tasks summary
    const tasksCompleted = complianceTasks.filter((t) => t.status === 'done').length;

    // Next deadlines (from obligations)
    const nextDeadlines = obligations
      .filter((o) => o.dueDate > new Date())
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .slice(0, 5)
      .map((o) => ({
        type: o.taxType,
        dueDate: o.dueDate.toISOString(),
      }));

    return {
      year: taxYear,
      business: {
        name: business.name,
        legalForm: business.legalForm,
        tin: business.tin,
        cacNumber: business.cacNumber,
      },
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        estimatedProfit: profit,
        transactionsCount: transactions.length,
        documentsCount: documents.length,
        monthsCovered,
        receiptCoverage: Math.round(receiptCoverage * 100) / 100,
      },
      taxProfile: taxProfile
        ? {
            citStatus: taxProfile.citStatus,
            vatStatus: taxProfile.vatStatus,
            whtStatus: taxProfile.whtStatus,
          }
        : null,
      complianceTasks: {
        total: complianceTasks.length,
        completed: tasksCompleted,
      },
      nextDeadlines,
    };
  }

  async buildPDF(summary: PackSummary): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = height - 50;

    // Title
    page.drawText(`FIRS Filing Pack - ${summary.year}`, {
      x: 50,
      y,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    y -= 40;

    // Business Info
    page.drawText(`Business: ${summary.business.name}`, {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    });
    y -= 20;
    page.drawText(`Legal Form: ${summary.business.legalForm}`, {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 15;
    if (summary.business.tin) {
      page.drawText(`TIN: ${summary.business.tin}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 15;
    }
    if (summary.business.cacNumber) {
      page.drawText(`CAC Number: ${summary.business.cacNumber}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 15;
    }

    y -= 20;

    // Tax Status
    if (summary.taxProfile) {
      page.drawText('Tax Status:', {
        x: 50,
        y,
        size: 12,
        font: boldFont,
      });
      y -= 20;
      page.drawText(`CIT: ${summary.taxProfile.citStatus}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 15;
      page.drawText(`VAT: ${summary.taxProfile.vatStatus}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 15;
      page.drawText(`WHT: ${summary.taxProfile.whtStatus}`, {
        x: 50,
        y,
        size: 10,
        font,
      });
      y -= 20;
    }

    // Financial Summary
    page.drawText('Financial Summary:', {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    });
    y -= 20;
    page.drawText(
      `Total Income: ₦${summary.summary.totalIncome.toLocaleString('en-NG')}`,
      {
        x: 50,
        y,
        size: 10,
        font,
      },
    );
    y -= 15;
    page.drawText(
      `Total Expenses: ₦${summary.summary.totalExpenses.toLocaleString('en-NG')}`,
      {
        x: 50,
        y,
        size: 10,
        font,
      },
    );
    y -= 15;
    page.drawText(
      `Estimated Profit: ₦${summary.summary.estimatedProfit.toLocaleString('en-NG')}`,
      {
        x: 50,
        y,
        size: 10,
        font,
      },
    );
    y -= 20;

    // Records Summary
    page.drawText('Records Summary:', {
      x: 50,
      y,
      size: 12,
      font: boldFont,
    });
    y -= 20;
    page.drawText(`Transactions: ${summary.summary.transactionsCount}`, {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 15;
    page.drawText(`Documents: ${summary.summary.documentsCount}`, {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 15;
    page.drawText(`Months Covered: ${summary.summary.monthsCovered}`, {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 15;
    if (summary.summary.receiptCoverage !== undefined) {
      page.drawText(
        `Receipt Coverage: ${summary.summary.receiptCoverage.toFixed(1)}%`,
        {
          x: 50,
          y,
          size: 10,
          font,
        },
      );
      y -= 20;
    }

    // Compliance Tasks
    if (summary.complianceTasks) {
      page.drawText('Compliance Tasks:', {
        x: 50,
        y,
        size: 12,
        font: boldFont,
      });
      y -= 20;
      page.drawText(
        `Completed: ${summary.complianceTasks.completed} / ${summary.complianceTasks.total}`,
        {
          x: 50,
          y,
          size: 10,
          font,
        },
      );
      y -= 20;
    }

    // Next Deadlines
    if (summary.nextDeadlines && summary.nextDeadlines.length > 0) {
      page.drawText('Upcoming Deadlines:', {
        x: 50,
        y,
        size: 12,
        font: boldFont,
      });
      y -= 20;
      summary.nextDeadlines.forEach((deadline) => {
        const date = new Date(deadline.dueDate).toLocaleDateString('en-NG');
        page.drawText(`${deadline.type}: ${date}`, {
          x: 50,
          y,
          size: 10,
          font,
        });
        y -= 15;
      });
    }

    // Footer
    y = 50;
    page.drawText(`Prepared by Rorun - ${new Date().toLocaleString('en-NG')}`, {
      x: 50,
      y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async buildCSV(businessId: string, taxYear: number): Promise<Buffer> {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        businessId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        classification: 'business' as any,
      } as any,
      include: {
        category: true,
      } as any,
      orderBy: {
        date: 'asc',
      },
    });

    const rows: string[][] = [
      ['Date', 'Type', 'Description', 'Amount', 'Currency', 'Category'],
    ];

    transactions.forEach((tx) => {
      rows.push([
        tx.date.toISOString().split('T')[0],
        tx.type,
        tx.description || '',
        tx.amount.toString(),
        tx.currency,
        (tx as any).category?.name || '',
      ]);
    });

    const csvContent = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  async buildZIP(
    businessId: string,
    taxYear: number,
    pdfBuffer: Buffer,
    csvBuffer: Buffer,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let archiverFactory: any;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        archiverFactory = require('archiver');
      } catch (e) {
        reject(
          new Error(
            'ZIP export is not available: missing optional dependency `archiver`. Install it in the server service to enable ZIP exports.',
          ),
        );
        return;
      }

      const archive = archiverFactory('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Add PDF and CSV
      archive.append(pdfBuffer, { name: `filing-pack-${taxYear}.pdf` });
      archive.append(csvBuffer, { name: `transactions-${taxYear}.csv` });

      // Add attachments
      this.addAttachmentsToZip(archive, businessId, taxYear)
        .then(() => {
          archive.finalize();
        })
        .catch(reject);
    });
  }

  private async addAttachmentsToZip(
    archive: any,
    businessId: string,
    taxYear: number,
  ): Promise<void> {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    // Get business-classified transactions for filtering attachments
    const businessTxIds = await this.prisma.transaction.findMany({
      where: {
        businessId,
        classification: 'business' as any,
        date: { gte: startDate, lte: endDate },
      } as any,
      select: { id: true },
    });
    const idList = businessTxIds.map((t) => t.id);

    // Get documents for the tax year:
    // - always include unlinked documents (e.g. bank statements)
    // - include linked documents only if they link to business-classified transactions
    const documents = await this.prisma.document.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate, lte: endDate },
        OR: [
          { relatedTransactionId: null },
          ...(idList.length > 0 ? [{ relatedTransactionId: { in: idList } }] : []),
        ],
      },
    });

    // Group by type
    const grouped: Record<string, typeof documents> = {
      receipts: [],
      bank_statements: [],
      invoices: [],
      other: [],
    };

    documents.forEach((doc) => {
      const type = doc.type || 'other';
      if (type === 'receipt') {
        grouped.receipts.push(doc);
      } else if (type === 'bank_statement') {
        grouped.bank_statements.push(doc);
      } else if (type === 'invoice') {
        grouped.invoices.push(doc);
      } else {
        grouped.other.push(doc);
      }
    });

    // Add documents to zip
    for (const [folder, docs] of Object.entries(grouped)) {
      if (docs.length === 0) continue;

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        try {
          const downloadUrl = await this.storageService.getSignedDownloadUrl(doc.storageUrl, 3600);
          const response = await fetch(downloadUrl);
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const ext = doc.mimeType?.split('/')[1] || 'bin';
            archive.append(buffer, {
              name: `attachments/${folder}/${doc.id}.${ext}`,
            });
          }
        } catch (error) {
          console.error(`Failed to add document ${doc.id} to zip:`, error);
          // Continue with other documents
        }
      }
    }
  }
}

