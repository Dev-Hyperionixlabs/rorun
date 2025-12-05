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

    const totalAmount = data.items.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        invoiceNumber,
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        customerName: data.customerName,
        customerContact: data.customerContact,
        notes: data.notes,
        totalAmount,
        currency: 'NGN',
        items: {
          create: data.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
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
        business: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!invoice || invoice.business.ownerUserId !== userId) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    const { business, ...result } = invoice;
    return result;
  }

  async update(id: string, userId: string, data: UpdateInvoiceDto) {
    await this.findOne(id, userId);

    return this.prisma.invoice.update({
      where: { id },
      data,
      include: {
        items: true,
      },
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

