import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { StorageService } from '../storage/storage.service';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class ReportingService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private storageService: StorageService,
  ) {}

  async getYearlySummary(businessId: string, userId: string, year: number) {
    // If any DB table is missing (transactions/taxProfile), avoid 500 and return an empty summary
    await this.businessesService.findOne(businessId, userId);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    let transactions: any[] = [];
    let business: any = null;
    let taxProfile: any = null;

    try {
      [transactions, business, taxProfile] = await Promise.all([
        this.prisma.transaction.findMany({
          where: {
            businessId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            category: true,
          },
        }),
        this.businessesService.findOne(businessId, userId),
        this.prisma.taxProfile.findUnique({
          where: {
            businessId_taxYear: {
              businessId,
              taxYear: year,
            },
          },
        }),
      ]);
    } catch (err: any) {
      console.error('[ReportingService.getYearlySummary] Failed, returning empty summary:', err?.message);
      // best-effort: fetch minimal business info so UI can render name
      try {
        business = business || (await this.businessesService.findOne(businessId, userId));
      } catch {
        business = { name: 'Workspace', legalForm: null, tin: null };
      }
      return {
        year,
        business: {
          name: business?.name || 'Workspace',
          legalForm: business?.legalForm || null,
          tin: business?.tin || null,
        },
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          estimatedProfit: 0,
          transactionsCount: 0,
          documentsCount: 0,
        },
        expensesByCategory: {},
        taxProfile: null,
      };
    }

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const profit = income - expenses;

    // Group expenses by category
    const expensesByCategory = transactions
      .filter((t) => t.type === 'expense')
      .reduce(
        (acc, t) => {
          const categoryName = t.category?.name || 'Uncategorised';
          acc[categoryName] = (acc[categoryName] || 0) + Number(t.amount);
          return acc;
        },
        {} as Record<string, number>,
      );

    // Get documents count
    const documentsCount = await this.prisma.document.count({
      where: {
        businessId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    return {
      year,
      business: {
        name: business.name,
        legalForm: business.legalForm,
        tin: business.tin,
      },
      summary: {
        totalIncome: income,
        totalExpenses: expenses,
        estimatedProfit: profit,
        transactionsCount: transactions.length,
        documentsCount,
      },
      expensesByCategory,
      taxProfile: taxProfile || null,
    };
  }

  async generateYearEndPack(businessId: string, userId: string, year: number) {
    const summary = await this.getYearlySummary(businessId, userId, year);

    // Generate PDF
    const pdfBuffer = await this.generatePDF(summary);

    // Generate CSV
    const csvBuffer = await this.generateCSV(summary);

    // Upload to storage
    const pdfKey = `businesses/${businessId}/reports/${year}/pack.pdf`;
    const csvKey = `businesses/${businessId}/reports/${year}/pack.csv`;

    await this.storageService.uploadFile(pdfBuffer, pdfKey, 'application/pdf');
    await this.storageService.uploadFile(csvBuffer, csvKey, 'text/csv');

    // Store pack metadata (you might want a separate table for this)
    return {
      pdfUrl: pdfKey,
      csvUrl: csvKey,
      year,
      generatedAt: new Date(),
    };
  }

  private async generatePDF(summary: any): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // US Letter size
    const { height } = page.getSize();

    // Simple PDF generation (in production, use a template engine like Puppeteer)
    const font = await pdfDoc.embedFont('Helvetica');
    let y = height - 50;

    page.drawText(`Year-End Tax Pack - ${summary.year}`, {
      x: 50,
      y,
      size: 20,
      font,
    });

    y -= 40;
    page.drawText(`Business: ${summary.business.name}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    y -= 30;
    page.drawText(`Total Income: NGN ${summary.summary.totalIncome.toLocaleString()}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    y -= 20;
    page.drawText(`Total Expenses: NGN ${summary.summary.totalExpenses.toLocaleString()}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    y -= 20;
    page.drawText(`Estimated Profit: NGN ${summary.summary.estimatedProfit.toLocaleString()}`, {
      x: 50,
      y,
      size: 12,
      font,
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async generateCSV(summary: any): Promise<Buffer> {
    const rows = [
      ['Year', summary.year],
      ['Business Name', summary.business.name],
      ['Total Income', summary.summary.totalIncome],
      ['Total Expenses', summary.summary.totalExpenses],
      ['Estimated Profit', summary.summary.estimatedProfit],
      ['Transactions Count', summary.summary.transactionsCount],
      ['Documents Count', summary.summary.documentsCount],
      [],
      ['Expenses by Category'],
      ...Object.entries(summary.expensesByCategory).map(([cat, amount]) => [cat, amount]),
    ];

    const csvContent = rows.map((row) => row.join(',')).join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }
}
