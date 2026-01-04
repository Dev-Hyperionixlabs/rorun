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

  async create(businessId: string, userId: string, data: CreateInvoiceDto) {
    await this.businessesService.findOne(businessId, userId);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(businessId);

    const subtotalAmount = data.items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
      0,
    );
    const totalAmount = subtotalAmount;

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
    await this.findOne(id, userId);

    const patch: any = {
      clientId: data.clientId,
      jobId: data.jobId === undefined ? undefined : data.jobId,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      status: data.status,
      currency: data.currency,
      notes: data.notes,
    };

    // If items provided, replace line items and recompute totals.
    if (data.items) {
      const subtotalAmount = data.items.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
        0,
      );
      patch.subtotalAmount = subtotalAmount;
      patch.totalAmount = subtotalAmount;
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: patch,
      include: { items: true },
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
      return this.prisma.invoice.findUnique({ where: { id }, include: { items: true } });
    }

    return updated;
  }

  async markPaid(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'paid' },
      include: { items: true },
    });
  }

  private async generateInvoiceNumber(businessId: string): Promise<string> {
    const count = await this.prisma.invoice.count({
      where: { businessId },
    });

    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
  }
}
