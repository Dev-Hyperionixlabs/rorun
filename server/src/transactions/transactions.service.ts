import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionQueryDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  async create(businessId: string, userId: string, data: CreateTransactionDto) {
    // Verify business ownership
    await this.businessesService.findOne(businessId, userId);

    return this.prisma.transaction.create({
      data: {
        ...data,
        businessId,
      },
      include: {
        category: true,
        aiCategory: true,
        documents: true,
      },
    });
  }

  async findAll(businessId: string, userId: string, query: TransactionQueryDto) {
    // Verify business ownership
    await this.businessesService.findOne(businessId, userId);

    const where: any = {
      businessId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) {
        where.date.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.date.lte = new Date(query.endDate);
      }
    }

    if (query.minAmount || query.maxAmount) {
      where.amount = {};
      if (query.minAmount) {
        where.amount.gte = query.minAmount;
      }
      if (query.maxAmount) {
        where.amount.lte = query.maxAmount;
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: {
          category: true,
          aiCategory: true,
          documents: true,
        },
        orderBy: {
          date: 'desc',
        },
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      total,
      skip: query.skip || 0,
      take: query.take || 50,
    };
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        aiCategory: true,
        documents: true,
        business: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    if (transaction.business.ownerUserId !== userId) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    const { business, ...result } = transaction;
    return result;
  }

  async update(id: string, userId: string, data: UpdateTransactionDto) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: true,
        aiCategory: true,
        documents: true,
      },
    });
  }

  async remove(id: string, userId: string) {
    // Verify ownership
    await this.findOne(id, userId);

    return this.prisma.transaction.delete({
      where: { id },
    });
  }
}

