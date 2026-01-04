import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  private round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  private computeTotals(items: { quantity: any; unitPrice: any }[], taxType?: string | null, taxRate?: any | null) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
    const normalizedType = (taxType || 'none').toLowerCase();

    if (normalizedType === 'none') {
      return { subtotalAmount: subtotal, taxAmount: null, totalAmount: subtotal };
    }

    const rate = Number(taxRate);
    const safeRate = Number.isFinite(rate) ? rate : 0;
    const taxAmount = this.round2(subtotal * safeRate);
    const totalAmount = this.round2(subtotal + taxAmount);
    return { subtotalAmount: subtotal, taxAmount, totalAmount };
  }

  async create(businessId: string, userId: string, data: CreateInvoiceDto) {
    await this.businessesService.findOne(businessId, userId);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(businessId);

    const normalizedTaxType = (data.taxType || 'none').toLowerCase();
    const taxType = ['none', 'vat', 'wht', 'custom'].includes(normalizedTaxType) ? normalizedTaxType : 'none';
    const taxRate = taxType === 'none' ? null : (data.taxRate ?? null);
    const taxLabel = taxType === 'none' ? null : (data.taxLabel ?? null);
    const templateKey =
      data.templateKey && ['classic', 'modern', 'minimal'].includes(String(data.templateKey).toLowerCase())
        ? String(data.templateKey).toLowerCase()
        : null;

    const { subtotalAmount, taxAmount, totalAmount } = this.computeTotals(
      data.items,
      taxType,
      taxRate,
    );

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        clientId: data.clientId,
        jobId: data.jobId || null,
        invoiceNumber,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes,
        subtotalAmount,
        taxType,
        taxRate,
        taxLabel,
        taxAmount,
        templateKey,
        totalAmount,
        currency: data.currency || 'NGN',
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: Number(item.quantity) * Number(item.unitPrice),
          })),
        },
      },
      include: {
        items: true,
        client: true,
        job: true,
      },
    });

    return invoice;
  }

  async findAll(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    return this.prisma.invoice.findMany({
      where: { businessId },
      include: {
        items: true,
        client: true,
        job: true,
      },
      orderBy: {
        issueDate: 'desc',
      },
    });
  }

  async findOne(id: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        client: true,
        job: true,
        business: { select: { id: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    await this.businessesService.findOne(invoice.business.id, userId);

    const { business, ...result } = invoice;
    void business;
    return result;
  }

  async update(id: string, userId: string, data: UpdateInvoiceDto) {
    const existing = await this.prisma.invoice.findUnique({
      where: { id },
      include: { items: true, business: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException(`Invoice with ID ${id} not found`);
    await this.businessesService.findOne(existing.business.id, userId);

    const patch: any = {
      clientId: data.clientId,
      jobId: data.jobId === undefined ? undefined : data.jobId,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      status: data.status,
      currency: data.currency,
      notes: data.notes,
    };

    // Normalize tax patch (if provided)
    const nextTaxTypeRaw =
      data.taxType !== undefined ? (data.taxType as any) : (existing.taxType as any);
    const nextTaxType = ['none', 'vat', 'wht', 'custom'].includes((nextTaxTypeRaw || 'none').toLowerCase())
      ? (nextTaxTypeRaw || 'none').toLowerCase()
      : 'none';
    const nextTaxRate =
      data.taxRate !== undefined ? (data.taxRate as any) : (existing.taxRate as any);
    const nextTaxLabel =
      data.taxLabel !== undefined ? (data.taxLabel as any) : (existing.taxLabel as any);

    if (data.taxType !== undefined) patch.taxType = nextTaxType;
    if (data.taxRate !== undefined) patch.taxRate = nextTaxType === 'none' ? null : nextTaxRate;
    if (data.taxLabel !== undefined) patch.taxLabel = nextTaxType === 'none' ? null : nextTaxLabel;
    if (data.templateKey !== undefined) {
      patch.templateKey = data.templateKey === null ? null : (data.templateKey as any);
    }

    // If items or tax changed, recompute totals.
    const recompute = !!data.items || data.taxType !== undefined || data.taxRate !== undefined;
    if (recompute) {
      const baseItems = data.items ?? (existing.items as any);
      const { subtotalAmount, taxAmount, totalAmount } = this.computeTotals(baseItems, nextTaxType, nextTaxRate);
      patch.subtotalAmount = subtotalAmount;
      patch.taxAmount = nextTaxType === 'none' ? null : taxAmount;
      patch.totalAmount = totalAmount;
      if (nextTaxType === 'none') {
        patch.taxRate = null;
        patch.taxLabel = null;
      }
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: patch,
      include: { items: true, client: true, job: true },
    });

    if (data.items) {
      await this.prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
      await this.prisma.invoiceItem.createMany({
        data: data.items.map((item) => ({
          invoiceId: id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Number(item.quantity) * Number(item.unitPrice),
        })),
      });
      return this.prisma.invoice.findUnique({ where: { id }, include: { items: true, client: true, job: true } });
    }

    return updated;
  }

  async markPaid(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'paid' },
      include: { items: true, client: true, job: true },
    });
  }

  async getInvoicePdfData(businessId: string, userId: string, invoiceId: string) {
    // Business-scoped access
    await this.businessesService.findOne(businessId, userId);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        client: true,
        job: true,
        business: {
          select: {
            id: true,
            name: true,
            invoiceDisplayName: true,
            invoiceLogoUrl: true,
            invoiceAddressLine1: true,
            invoiceAddressLine2: true,
            invoiceCity: true,
            invoiceState: true,
            invoiceCountry: true,
            invoicePostalCode: true,
            invoiceFooterNote: true,
            invoiceTemplateKey: true,
            paymentBankName: true,
            paymentAccountName: true,
            paymentAccountNumber: true,
            paymentInstructionsNote: true,
          } as any,
        },
      },
    });

    if (!invoice || invoice.businessId !== businessId) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice as any;
  }

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const count = await this.prisma.invoice.count({
      where: { businessId },
    });

    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
