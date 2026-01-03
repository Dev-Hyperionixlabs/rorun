import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(input: {
    message: string;
    email?: string;
    pageUrl?: string;
    businessId?: string;
    userId?: string;
  }) {
    return (this.prisma as any).feedback.create({
      data: {
        message: input.message,
        email: input.email || null,
        pageUrl: input.pageUrl || null,
        businessId: input.businessId || null,
        userId: input.userId || null,
        status: 'open',
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
      },
    });
  }

  async list(params: { status?: 'open' | 'resolved'; limit?: number; offset?: number }) {
    const take = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const skip = Math.max(params.offset ?? 0, 0);

    const where: any = {};
    if (params.status) where.status = params.status;

    const [items, total] = await Promise.all([
      (this.prisma as any).feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      (this.prisma as any).feedback.count({ where }),
    ]);

    return { items, total, skip, take };
  }

  async update(id: string, data: { status?: 'open' | 'resolved'; adminNotes?: string }) {
    return (this.prisma as any).feedback.update({
      where: { id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes,
      },
    });
  }
}


