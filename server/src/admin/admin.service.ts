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
    try {
      // Try simple query first to avoid schema drift on relations
      const businesses = await this.prisma.business.findMany({
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });
      return businesses;
    } catch (err: any) {
      console.error('[AdminService.getBusinesses] Failed with includes:', err?.message);
      // Fallback to simple query
      try {
        return await this.prisma.business.findMany();
      } catch {
        return [];
      }
    }
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
    if (state) where.state = state;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { sector: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Try to get businesses - handle potential schema issues
    let businesses: any[] = [];
    try {
      businesses = await this.prisma.business.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      console.error('[AdminService.listWorkspaces] Failed to query businesses:', err?.message);
      return { items: [] };
    }

    // Get subscriptions separately to avoid schema drift issues
    const businessIds = businesses.map((b) => b.id);
    let subscriptionMap: Record<string, string> = {};
    try {
      const subs = await this.prisma.subscription.findMany({
        where: { businessId: { in: businessIds }, status: 'active' },
        select: { businessId: true, planId: true },
      });
      for (const sub of subs) {
        subscriptionMap[sub.businessId] = sub.planId;
      }
    } catch {
      // Subscription table might not exist - default all to free
    }

    // Filter by plan if requested (after fetching)
    if (plan) {
      businesses = businesses.filter((b) => (subscriptionMap[b.id] || 'free') === plan);
    }

    const now = new Date();
    const items = [];
    for (const biz of businesses) {
      // Wrap score computation in try/catch to prevent one failure from breaking the list
      let scoreVal = 0;
      let scoreBand: 'low' | 'medium' | 'high' = 'low';
      try {
        const scoreData = await this.taxSafetyService.getTaxSafetyScore(
          biz.id,
          biz.ownerUserId,
          now.getFullYear(),
        );
        scoreVal = scoreData.score;
        scoreBand = scoreData.band;
      } catch (err: any) {
        console.warn(`[AdminService] Score computation failed for ${biz.id}:`, err?.message);
      }

      let transactionsCountYearToDate = 0;
      try {
        transactionsCountYearToDate = await this.prisma.transaction.count({
          where: {
            businessId: biz.id,
            date: {
              gte: new Date(now.getFullYear(), 0, 1),
              lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
            },
          },
        });
      } catch {
        // Transaction table might have issues
      }

      items.push({
        id: biz.id,
        name: biz.name,
        state: biz.state,
        sector: biz.sector,
        planId: subscriptionMap[biz.id] ?? 'free',
        createdAt: biz.createdAt,
        taxYear: now.getFullYear(),
        firsReadyScore: scoreVal,
        firsReadyBand: scoreBand,
        transactionsCountYearToDate,
      });
    }

    return { items };
  }

  async getWorkspaceDetail(id: string) {
    let biz: any = null;
    try {
      biz = await this.prisma.business.findUnique({ where: { id } });
    } catch (err: any) {
      console.error('[AdminService.getWorkspaceDetail] DB error:', err?.message);
      return null;
    }
    if (!biz) {
      return null;
    }

    // Get subscription separately
    let planId = 'free';
    try {
      const sub = await this.prisma.subscription.findFirst({
        where: { businessId: id, status: 'active' },
        select: { planId: true },
      });
      if (sub) planId = sub.planId;
    } catch {
      // Subscription table might not exist
    }

    const now = new Date();
    let scoreData: { score: number; band: 'low' | 'medium' | 'high'; reasons: string[] } = {
      score: 0,
      band: 'low',
      reasons: [],
    };
    try {
      const apiScore = await this.taxSafetyService.getTaxSafetyScore(
        biz.id,
        biz.ownerUserId,
        now.getFullYear(),
      );
      scoreData = {
        score: apiScore.score,
        band: apiScore.band,
        reasons: apiScore.reasons || [],
      };
    } catch (err: any) {
      console.warn(`[AdminService] Score failed for ${biz.id}:`, err?.message);
    }

    let lastTx: any = null;
    let txCount = 0;
    try {
      [lastTx, txCount] = await Promise.all([
        this.prisma.transaction.findFirst({
          where: { businessId: id },
          orderBy: { date: 'desc' },
        }),
        this.prisma.transaction.count({
          where: {
            businessId: id,
            date: {
              gte: new Date(now.getFullYear(), 0, 1),
              lte: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
            },
          },
        }),
      ]);
    } catch {
      // Transactions table might have issues
    }

    let packs: any[] = [];
    try {
      packs = await this.prisma.filingPack.findMany({
        where: { businessId: id },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      // Filing packs table might not exist
    }

    return {
      business: {
        id: biz.id,
        name: biz.name,
        state: biz.state,
        sector: biz.sector,
        legalForm: biz.legalForm,
        ownerUserId: biz.ownerUserId,
        createdAt: biz.createdAt,
      },
      planId,
      firsReady: scoreData,
      transactions: {
        yearToDateCount: txCount,
        lastTransactionAt: lastTx?.date ?? null,
      },
      filingPacks: packs,
    };
  }

  async setWorkspacePlan(id: string, planId: string) {
    try {
      // Known plan keys that we support (matches frontend entitlements)
      const KNOWN_PLANS = ['free', 'basic', 'business', 'accountant'];
      const normalizedPlanId = planId.toLowerCase();
      
      // Try to find plan in DB (optional - plans table may not exist or be seeded)
      let dbPlanId: string = planId;
      try {
        let plan = await this.prisma.plan.findFirst({
          where: { 
            OR: [
              { id: planId },
              { planKey: normalizedPlanId }
            ],
            isActive: true
          },
        }).catch(() => null);
        
        if (!plan) {
          plan = await this.prisma.plan.findFirst({
            where: { id: planId, isActive: true },
          }).catch(() => null);
        }
        
        if (plan) {
          dbPlanId = plan.id;
        }
      } catch (err: any) {
        console.warn('[AdminService.setWorkspacePlan] Plan lookup failed:', err?.message);
      }
      
      // If no DB plan found, check if it's a known plan key
      if (dbPlanId === planId && !KNOWN_PLANS.includes(normalizedPlanId)) {
        throw new Error(`Plan '${planId}' is not recognized. Use: free, basic, business, or accountant.`);
      }
      
      // Use the normalized plan key if DB plan wasn't found
      const effectivePlanId = dbPlanId || normalizedPlanId;

      const biz = await this.prisma.business.findUnique({ where: { id } });
      if (!biz) {
        throw new Error(`Business with ID '${id}' not found`);
      }

      const now = new Date();
      
      // Deactivate current active subscriptions
      await this.prisma.subscription.updateMany({
        where: { businessId: id, status: 'active' },
        data: { status: 'ended', endsAt: now },
      }).catch(() => {
        // Ignore if no active subscriptions exist
      });

      // Check if subscription already exists for this business
      const existing = await this.prisma.subscription.findFirst({
        where: { businessId: id },
      }).catch(() => null);

      let sub;
      if (existing) {
        // Update existing subscription
        sub = await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            userId: biz.ownerUserId,
            planId: effectivePlanId,
            status: 'active',
            startedAt: now,
            endsAt: null,
          },
        });
      } else {
        // Create new subscription
        sub = await this.prisma.subscription.create({
          data: {
            businessId: id,
            userId: biz.ownerUserId,
            planId: effectivePlanId,
            status: 'active',
            startedAt: now,
          },
        });
      }
      
      return { planId: effectivePlanId };
    } catch (err: any) {
      console.error('[AdminService.setWorkspacePlan] Failed:', err?.message);
      throw err;
    }
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

    let totalUsers = 0;
    let totalBusinesses = 0;
    let totalTransactions = 0;
    const planCounts: Record<string, number> = { free: 0 };

    try {
      totalUsers = await this.prisma.user.count();
    } catch (err: any) {
      console.error('[AdminService.getDashboardStats] user.count failed:', err?.message);
    }

    try {
      totalBusinesses = await this.prisma.business.count();
    } catch (err: any) {
      console.error('[AdminService.getDashboardStats] business.count failed:', err?.message);
    }

    try {
      totalTransactions = await this.prisma.transaction.count({
        where: { date: { gte: startOfYear } },
      });
    } catch (err: any) {
      console.error('[AdminService.getDashboardStats] transaction.count failed:', err?.message);
    }

    try {
      const planBreakdown = await this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: 'active' },
        _count: { planId: true },
      });

      const businessesWithActiveSub = await this.prisma.subscription.findMany({
        where: { status: 'active' },
        select: { businessId: true },
        distinct: ['businessId'],
      });
      const freeCount =
        totalBusinesses - new Set(businessesWithActiveSub.map((s) => s.businessId)).size;

      planCounts.free = freeCount > 0 ? freeCount : totalBusinesses;
      for (const row of planBreakdown) {
        planCounts[row.planId] = row._count.planId;
      }
    } catch (err: any) {
      // Subscription table might not exist - all businesses are free
      console.error('[AdminService.getDashboardStats] subscription query failed:', err?.message);
      planCounts.free = totalBusinesses;
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
