import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditEventInput {
  businessId?: string | null;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metaJson?: any;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createAuditEvent(input: CreateAuditEventInput) {
    const { metaJson, ...data } = input;
    
    return this.prisma.auditEvent.create({
      data: {
        ...data,
        businessId: data.businessId ?? null,
        metaJson: metaJson ? metaJson : undefined,
      },
    });
  }

  async getAuditEvents(businessId: string, filters?: {
    action?: string;
    entityType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = { businessId };
    if (filters?.action) where.action = filters.action;
    if (filters?.entityType) where.entityType = filters.entityType;

    return this.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });
  }
}

