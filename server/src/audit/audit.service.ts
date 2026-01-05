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

    // Normalize potentially-non-string header values (e.g. Express can supply string[]).
    const normalize = (v: any): string | null => {
      if (v === undefined || v === null) return null;
      if (Array.isArray(v)) return v.length ? String(v[0]) : null;
      return String(v);
    };
    
    return this.prisma.auditEvent.create({
      data: {
        ...data,
        businessId: data.businessId ?? null,
        ip: normalize((data as any).ip),
        userAgent: normalize((data as any).userAgent),
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

