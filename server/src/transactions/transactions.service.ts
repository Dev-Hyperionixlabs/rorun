import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import {
  CreateTransactionDto,
  UpdateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';

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
        // Manual entries default to business (deterministic + safe because user is explicitly recording)
        classification: 'business',
        isBusinessFlag: true,
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

    // Normalize pagination params (support both skip/take and offset/limit)
    const skip = query.skip ?? query.offset ?? 0;
    const take = query.take ?? query.limit ?? 50;

    const where: any = {
      businessId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    // Year filter
    if (query.year) {
      where.date = {
        gte: new Date(`${query.year}-01-01`),
        lte: new Date(`${query.year}-12-31T23:59:59.999Z`),
      };
    }

    if (query.startDate || query.endDate) {
      where.date = where.date || {};
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

    try {
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
          skip,
          take,
        }),
        this.prisma.transaction.count({ where }),
      ]);

      return {
        items: transactions,
        total,
        skip,
        take,
      };
    } catch (err: any) {
      // If DB schema is missing tables/relations in prod, don't brick the dashboard.
      console.error('[TransactionsService.findAll] Failed, returning empty list:', err?.message);
      return {
        items: [],
        total: 0,
        skip,
        take,
      };
    }
  }

  async listCategories(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);
    return this.prisma.transactionCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        category: true,
        aiCategory: true,
        documents: true,
        business: { select: { id: true } },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Membership-aware access check (owner/member/accountant)
    await this.businessesService.findOne(transaction.business.id, userId);

    const { business, ...result } = transaction;
    void business;
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

  async exportTransactions(businessId: string, userId: string, query: TransactionQueryDto) {
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

    const transactions = await this.prisma.transaction.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Generate CSV
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Currency', 'Category'];
    const rows = transactions.map((t) => [
      t.date.toISOString().split('T')[0],
      t.type,
      t.description || '',
      t.amount.toString(),
      t.currency,
      t.category?.name || 'Uncategorised',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    return {
      csv: csvContent,
      count: transactions.length,
    };
  }
}
