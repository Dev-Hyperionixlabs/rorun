import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TaxSafetyService } from '../tax-safety/tax-safety.service';
import { JwtService } from '@nestjs/jwt';
import { ReportingService } from '../reporting/reporting.service';
import { BankService } from '../bank/bank.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private taxSafetyService: TaxSafetyService,
    private jwtService: JwtService,
    private reportingService: ReportingService,
    private bankService: BankService,
  ) {}

  validateAdminKey(key: string): boolean {
    const adminKey = this.configService.get<string>('ADMIN_SECRET_KEY');
    return key === adminKey;
  }

  async getBusinesses() {
    return this.prisma.business.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        subscriptions: {
          include: {
            plan: true,
          },
        },
      },
    });
  }

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async resetUserPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    return (this.prisma as any).user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true, email: true, name: true },
    });
  }

  async getTaxRules() {
    return this.prisma.taxRule.findMany({
      orderBy: [{ year: 'desc' }, { taxType: 'asc' }],
    });
  }

  async createTaxRule(data: any) {
    return this.prisma.taxRule.create({
      data,
    });
  }

  async updateTaxRule(id: string, data: any) {
    return this.prisma.taxRule.update({
      where: { id },
      data,
    });
  }

  async getKnowledgeArticles() {
    return this.prisma.knowledgeArticle.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createKnowledgeArticle(data: any) {
    return this.prisma.knowledgeArticle.create({
      data,
    });
  }

  async updateKnowledgeArticle(id: string, data: any) {
    return this.prisma.knowledgeArticle.update({
      where: { id },
      data,
    });
  }

  async listWorkspaces(query: {
    q?: string;
    plan?: string;
    state?: string;
    limit?: number;
    offset?: number;
  }) {
    const { q, plan, state, limit = 20, offset = 0 } = query;
    const where: any = {};
    if (plan) where.subscriptions = { some: { status: 'active', planId: plan } };
    if (state) where.state = state;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sector: { contains: q, mode: 'insensitive' } },
      ];
    }

    const businesses = await this.prisma.business.findMany({
      where,
      skip: offset,
      take: limit,
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const items = [];
    for (const biz of businesses) {
      const score = await this.taxSafetyService.getTaxSafetyScore(
        biz.id,
        biz.ownerUserId,
        now.getFullYear(),
      );
      const transactionsCountYearToDate = await this.prisma.transaction.count({
        where: {
          businessId: biz.id,
          date: {
            gte: new Date(now.getFullYear(), 0, 1),
            lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
          },
        },
      });
      items.push({
        id: biz.id,
        name: biz.name,
        state: biz.state,
        sector: biz.sector,
        planId: biz.subscriptions[0]?.planId ?? 'free',
        createdAt: biz.createdAt,
        taxYear: now.getFullYear(),
        firsReadyScore: score.score,
        firsReadyBand: score.band,
        transactionsCountYearToDate,
      });
    }

    return { items };
  }

  async getWorkspaceDetail(id: string) {
    const biz = await this.prisma.business.findUnique({
      where: { id },
      include: {
        subscriptions: {
          where: { status: 'active' },
          include: { plan: true },
        },
      },
    });
    if (!biz) {
      return null;
    }
    const now = new Date();
    const score = await this.taxSafetyService.getTaxSafetyScore(
      biz.id,
      biz.ownerUserId,
      now.getFullYear(),
    );
    const lastTx = await this.prisma.transaction.findFirst({
      where: { businessId: id },
      orderBy: { date: 'desc' },
    });
    const txCount = await this.prisma.transaction.count({
      where: {
        businessId: id,
        date: {
          gte: new Date(now.getFullYear(), 0, 1),
          lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
        },
      },
    });
    const packs = await this.prisma.filingPack.findMany({
      where: { businessId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      business: biz,
      planId: biz.subscriptions[0]?.planId ?? 'free',
      firsReady: score,
      transactions: {
        yearToDateCount: txCount,
        lastTransactionAt: lastTx?.date ?? null,
      },
      filingPacks: packs,
    };
  }

  async setWorkspacePlan(id: string, planId: string) {
    // deactivate current active
    await this.prisma.subscription.updateMany({
      where: { businessId: id, status: 'active' },
      data: { status: 'ended', endsAt: new Date() },
    });
    const biz = await this.prisma.business.findUnique({ where: { id } });
    const sub = await this.prisma.subscription.create({
      data: {
        businessId: id,
        userId: biz?.ownerUserId ?? '',
        planId,
        status: 'active',
        startedAt: new Date(),
      },
    });
    return { planId: sub.planId };
  }

  async listFilingPacks(businessId: string) {
    const packs = await this.prisma.filingPack.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
    });
    return { items: packs };
  }

  async regenerateFilingPack(businessId: string, year: number) {
    const biz = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!biz) {
      return { error: 'Business not found' };
    }

    // Generate the pack
    const packData = await this.reportingService.generateYearEndPack(
      businessId,
      biz.ownerUserId,
      year,
    );

    // Return generated storage keys. Filing packs are managed by the filing-pack module/job flow.
    return { pack: packData };
  }

  async listWorkspaceAlerts(businessId: string, query: { limit?: number; offset?: number }) {
    const { limit = 50, offset = 0 } = query;
    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.alert.count({ where: { businessId } }),
    ]);
    return { items: alerts, total };
  }

  async generateImpersonationToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { error: 'User not found' };
    }

    // Generate a short-lived JWT for impersonation
    const payload = {
      sub: user.id,
      phone: user.phone,
      impersonated: true,
    };
    const token = this.jwtService.sign(payload, { expiresIn: '1h' });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
      },
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [totalUsers, totalBusinesses, totalTransactions, planBreakdown] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.business.count(),
      this.prisma.transaction.count({
        where: { date: { gte: startOfYear } },
      }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: { planId: true },
      }),
    ]);

    // Count businesses without an active subscription (free tier)
    const businessesWithActiveSub = await this.prisma.subscription.findMany({
      where: { status: 'active' },
      select: { businessId: true },
      distinct: ['businessId'],
    });
    const freeCount =
      totalBusinesses - new Set(businessesWithActiveSub.map((s) => s.businessId)).size;

    const planCounts: Record<string, number> = { free: freeCount };
    for (const row of planBreakdown) {
      planCounts[row.planId] = row._count.planId;
    }

    return {
      totalUsers,
      totalBusinesses,
      transactionsYearToDate: totalTransactions,
      planBreakdown: planCounts,
    };
  }

  async getBankConnections() {
    return this.prisma.bankConnection.findMany({
      include: {
        business: {
          select: {
            id: true,
            name: true,
            ownerUserId: true,
          },
        },
        importEvents: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBankConnectionEvents(connectionId: string) {
    return this.prisma.bankImportEvent.findMany({
      where: { bankConnectionId: connectionId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async forceSyncBankConnection(connectionId: string) {
    const connection = await this.prisma.bankConnection.findUnique({
      where: { id: connectionId },
      include: {
        business: {
          select: {
            ownerUserId: true,
          },
        },
      },
    });

    if (!connection) {
      return { error: 'Connection not found' };
    }

    try {
      const result = await this.bankService.syncConnection(
        connectionId,
        connection.businessId,
        connection.business.ownerUserId,
      );
      return { success: true, result };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}
