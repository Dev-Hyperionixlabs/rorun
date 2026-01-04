import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(input: {
    category?: 'bug' | 'idea' | 'question';
    message: string;
    userEmail?: string;
    pageUrl?: string;
    businessId?: string;
    userId?: string;
  }) {
    return (this.prisma as any).feedback.create({
      data: {
        category: input.category || 'bug',
        message: input.message,
        userEmail: input.userEmail || null,
        pageUrl: input.pageUrl || null,
        businessId: input.businessId || null,
        userId: input.userId || null,
        status: 'new',
      },
      select: {
        id: true,
        createdAt: true,
        status: true,
      },
    });
  }

  async list(params: { status?: 'new' | 'triaged' | 'done' | 'open' | 'resolved'; limit?: number; offset?: number }) {
    const take = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const skip = Math.max(params.offset ?? 0, 0);

    const where: any = {};
    if (params.status) {
      // Backward compatibility: treat legacy statuses as new/done
      if (params.status === 'open') where.status = 'new';
      else if (params.status === 'resolved') where.status = 'done';
      else where.status = params.status;
    }

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

  async update(id: string, data: { status?: 'new' | 'triaged' | 'done' | 'open' | 'resolved'; adminNotes?: string }) {
    const mappedStatus =
      data.status === 'open' ? 'new' : data.status === 'resolved' ? 'done' : data.status;
    return (this.prisma as any).feedback.update({
      where: { id },
      data: {
        status: mappedStatus,
        adminNotes: data.adminNotes,
      },
    });
  }
}


