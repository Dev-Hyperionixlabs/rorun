import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';
import { PlansService } from '../plans/plans.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditService } from '../audit/audit.service';
import { MonoProvider } from './providers/mono.provider';
import { ExchangeMonoDto } from './dto/bank.dto';
import { BankConnectAttemptDto } from './dto/bank-connect-attempt.dto';
import * as crypto from 'crypto';
import { encrypt } from '../security/crypto';

const CONSENT_TEXT_VERSION = 'v1';
const SYNC_COOLDOWN_MINUTES = 10;

@Injectable()
export class BankService {
  private async setProviderToken(bankConnectionId: string, token: string) {
    const { ciphertext, iv } = encrypt(token);
    await this.prisma.bankConnection.update({
      where: { id: bankConnectionId },
      data: { providerTokenCiphertext: ciphertext, providerTokenIv: iv },
    });
  }
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
    private plansService: PlansService,
    private transactionsService: TransactionsService,
    private auditService: AuditService,
    private monoProvider: MonoProvider,
  ) {}

  async logConnectAttempt(
    businessId: string,
    userId: string,
    dto: BankConnectAttemptDto,
    ip?: string,
    userAgent?: string,
  ) {
    // best-effort only — never block the user flow
    try {
      await this.businessesService.findOne(businessId, userId);
      await (this.prisma as any).bankConnectAttempt.create({
        data: {
          businessId,
          userId,
          provider: (dto.provider || 'mono').toLowerCase(),
          countryCode: dto.countryCode ? dto.countryCode.toUpperCase() : null,
          success: !!dto.success,
          reason: dto.reason || null,
          ip: ip?.toString() || null,
          userAgent: userAgent?.toString() || null,
        },
      });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[BankService.logConnectAttempt] skipped:', e?.message);
    }
  }

  async getConnections(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    return this.prisma.bankConnection.findMany({
      where: {
        businessId,
        status: {
          not: 'disconnected',
        },
      },
      select: {
        id: true,
        businessId: true,
        provider: true,
        status: true,
        providerAccountId: true,
        institutionName: true,
        accountName: true,
        accountNumberMasked: true,
        currency: true,
        lastSyncedAt: true,
        lastSyncCursor: true,
        lastSyncRequestedAt: true,
        createdAt: true,
        updatedAt: true,
        consents: {
          where: { revokedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async initMono(businessId: string, userId: string) {
    await this.businessesService.findOne(businessId, userId);

    // Check feature access
    const hasFeature = await this.plansService.hasFeature(
      userId,
      businessId,
      'bank_connect',
    );

    if (!hasFeature) {
      throw new ForbiddenException({
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'Bank connection is not available in your current plan',
        featureKey: 'bank_connect',
        requiredPlan: 'business',
      });
    }

    return {
      publicKey: this.monoProvider.getPublicKey(),
      environment: this.monoProvider.getEnvironment(),
      consentText: 'By connecting your bank, you allow Rorun to access read-only transaction statements for the selected period to prepare compliance records. You can disconnect anytime.',
      consentTextVersion: CONSENT_TEXT_VERSION,
    };
  }

  async exchangeMono(
    businessId: string,
    userId: string,
    dto: ExchangeMonoDto,
    ip?: string,
    userAgent?: string,
  ) {
    await this.businessesService.findOne(businessId, userId);

    // Validate consent
    if (!dto.consentAccepted) {
      throw new BadRequestException({
        code: 'CONSENT_REQUIRED',
        message: 'Consent must be accepted to connect bank account',
      });
    }

    if (dto.consentTextVersion !== CONSENT_TEXT_VERSION) {
      throw new BadRequestException({
        code: 'INVALID_CONSENT_VERSION',
        message: 'Consent text version mismatch',
      });
    }

    // Check feature access
    const hasFeature = await this.plansService.hasFeature(
      userId,
      businessId,
      'bank_connect',
    );

    if (!hasFeature) {
      throw new ForbiddenException({
        code: 'FEATURE_NOT_AVAILABLE',
        message: 'Bank connection is not available in your current plan',
        featureKey: 'bank_connect',
        requiredPlan: 'business',
      });
    }

    // Exchange code for account ID
    const providerAccountId = await this.monoProvider.exchangeCodeForAccountId(
      dto.code,
    );

    // Fetch account info if not provided
    let accountInfo: {
      institution?: { name?: string };
      account?: { name?: string; mask?: string; currency?: string };
    } = {
      institution: dto.institution,
      account: dto.account,
    };

    if (!accountInfo.institution || !accountInfo.account) {
      accountInfo = await this.monoProvider.fetchAccountInfo(providerAccountId);
    }

    // Upsert connection
    const connection = await this.prisma.bankConnection.upsert({
      where: {
        businessId_provider_providerAccountId: {
          businessId,
          provider: 'mono',
          providerAccountId,
        },
      },
      select: {
        id: true,
        businessId: true,
        provider: true,
        status: true,
        providerAccountId: true,
        institutionName: true,
        accountName: true,
        accountNumberMasked: true,
        currency: true,
        lastSyncedAt: true,
        lastSyncCursor: true,
        lastSyncRequestedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      update: {
        status: 'active',
        institutionName: accountInfo.institution?.name || null,
        accountName: accountInfo.account?.name || null,
        accountNumberMasked: accountInfo.account?.mask || null,
        currency: accountInfo.account?.currency || 'NGN',
        updatedAt: new Date(),
      },
      create: {
        businessId,
        provider: 'mono',
        status: 'active',
        providerAccountId,
        institutionName: accountInfo.institution?.name || null,
        accountName: accountInfo.account?.name || null,
        accountNumberMasked: accountInfo.account?.mask || null,
        currency: accountInfo.account?.currency || 'NGN',
      },
    });

    // Create consent record
    await this.prisma.bankConsent.create({
      data: {
        businessId,
        bankConnectionId: connection.id,
        provider: 'mono',
        scope: {
          statements: true,
          balances: false,
          periodDays: dto.scope.periodDays,
        },
        consentTextVersion: CONSENT_TEXT_VERSION,
        acceptedAt: new Date(),
        acceptedByUserId: userId,
      },
    });

    // Create audit event
    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'bank.connect',
      entityType: 'BankConnection',
      entityId: connection.id,
      metaJson: {
        provider: 'mono',
        institutionName: accountInfo.institution?.name,
        scope: dto.scope,
      },
      ip,
      userAgent,
    });

    // Log event
    await this.prisma.bankImportEvent.create({
      data: {
        bankConnectionId: connection.id,
        type: 'sync_started',
        payloadJson: {
          action: 'connection_established',
        },
      },
    });

    return connection;
  }

  async syncConnection(
    connectionId: string,
    businessId: string,
    userId: string | null,
    ip?: string,
    userAgent?: string,
  ) {
    // For system jobs (userId=null), skip user validation but still verify business exists
    if (userId) {
      await this.businessesService.findOne(businessId, userId);
    } else {
      // Verify business exists for system jobs
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
      });
      if (!business) {
        throw new NotFoundException('Business not found');
      }
    }

    const connection = await this.prisma.bankConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection || connection.businessId !== businessId) {
      throw new NotFoundException('Bank connection not found');
    }

    if (connection.status === 'disconnected') {
      throw new BadRequestException('Connection is disconnected');
    }

    // Check sync cooldown
    if (connection.lastSyncRequestedAt) {
      const cooldownMs = SYNC_COOLDOWN_MINUTES * 60 * 1000;
      const timeSinceLastSync = Date.now() - connection.lastSyncRequestedAt.getTime();
      
      if (timeSinceLastSync < cooldownMs) {
        const retryAfterSeconds = Math.ceil((cooldownMs - timeSinceLastSync) / 1000);
        
        // Log denied audit event
        await this.auditService.createAuditEvent({
          businessId,
          actorUserId: userId,
          action: 'bank.sync.denied',
          entityType: 'BankConnection',
          entityId: connectionId,
          metaJson: { reason: 'cooldown', retryAfterSeconds },
          ip,
          userAgent,
        });

        throw new HttpException(
          {
            code: 'SYNC_COOLDOWN',
            message: 'Sync recently requested. Try again in a few minutes.',
            retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Update lastSyncRequestedAt
    await this.prisma.bankConnection.update({
      where: { id: connectionId },
      data: { lastSyncRequestedAt: new Date() },
    });

    // Check feature access for auto sync (manual sync allowed for all with bank_connect)
    // Skip feature check for system jobs (userId=null)
    let hasAutoSync = true;
    if (userId) {
      hasAutoSync = await this.plansService.hasFeature(
        userId,
        businessId,
        'bank_auto_sync',
      );
    }

    // Determine date range
    const to = new Date();
    const from = connection.lastSyncedAt
      ? connection.lastSyncedAt
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days back

    // Create audit event for sync start
    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'bank.sync.start',
      entityType: 'BankConnection',
      entityId: connectionId,
      metaJson: { from: from.toISOString(), to: to.toISOString() },
      ip,
      userAgent,
    });

    // Log sync start
    await this.prisma.bankImportEvent.create({
      data: {
        bankConnectionId: connection.id,
        type: 'sync_started',
        payloadJson: { from: from.toISOString(), to: to.toISOString() },
      },
    });

    try {
      // Fetch transactions from provider
      const transactions =
        connection.provider === 'mono'
          ? await this.monoProvider.fetchStatement(
              connection.providerAccountId,
              from,
              to,
            )
          : [];

      // Check if this is first sync or large import
      const isFirstSync = !connection.lastSyncedAt;
      const requiresReview = isFirstSync || transactions.length > 50;

      // Import transactions (with review workflow if needed)
      const result = await this.importTransactions(
        businessId,
        userId,
        transactions,
        connection.provider,
        connection.providerAccountId,
        connection.id,
        requiresReview,
      );

      // Update connection
      await this.prisma.bankConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncedAt: to,
          status: 'active',
        },
      });

      // Create audit event for sync success
      await this.auditService.createAuditEvent({
        businessId,
        actorUserId: userId,
        action: 'bank.sync.success',
        entityType: 'BankConnection',
        entityId: connectionId,
        metaJson: {
          ...result,
          requiresReview,
        },
        ip,
        userAgent,
      });

      // Log success
      await this.prisma.bankImportEvent.create({
        data: {
          bankConnectionId: connection.id,
          type: 'sync_success',
          payloadJson: result,
        },
      });

      return { ...result, requiresReview, importBatchId: result.importBatchId };
    } catch (error: any) {
      // Create audit event for sync failure
      await this.auditService.createAuditEvent({
        businessId,
        actorUserId: userId,
        action: 'bank.sync.fail',
        entityType: 'BankConnection',
        entityId: connectionId,
        metaJson: {
          error: error.message,
          errorCode: error.code || 'UNKNOWN',
        },
        ip,
        userAgent,
      });

      // Log failure
      await this.prisma.bankImportEvent.create({
        data: {
          bankConnectionId: connection.id,
          type: 'sync_failed',
          payloadJson: { error: error.message },
        },
      });

      // Update connection status
      await this.prisma.bankConnection.update({
        where: { id: connectionId },
        data: { status: 'error' },
      });

      // Standardize error response
      throw new HttpException(
        {
          code: error.code || 'BANK_SYNC_FAILED',
          message: error.message || 'Bank sync failed',
          details: error.response?.data || error.details,
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async disconnectConnection(
    connectionId: string,
    businessId: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ) {
    await this.businessesService.findOne(businessId, userId);

    const connection = await this.prisma.bankConnection.findUnique({
      where: { id: connectionId },
      include: {
        consents: {
          where: { revokedAt: null },
        },
      },
    });

    if (!connection || connection.businessId !== businessId) {
      throw new NotFoundException('Bank connection not found');
    }

    // Update connection status
    await this.prisma.bankConnection.update({
      where: { id: connectionId },
      data: { status: 'disconnected' },
    });

    // Revoke all active consents
    for (const consent of connection.consents) {
      await this.prisma.bankConsent.update({
        where: { id: consent.id },
        data: {
          revokedAt: new Date(),
          revokedByUserId: userId,
        },
      });
    }

    // Create audit event
    await this.auditService.createAuditEvent({
      businessId,
      actorUserId: userId,
      action: 'bank.disconnect',
      entityType: 'BankConnection',
      entityId: connectionId,
      metaJson: {
        provider: connection.provider,
        institutionName: connection.institutionName,
      },
      ip,
      userAgent,
    });

    return { success: true };
  }

  /**
   * Import transactions with deduplication and review workflow
   */
  private async importTransactions(
    businessId: string,
    userId: string,
    transactions: Array<{
      date: Date;
      description: string;
      amount: number;
      direction: 'credit' | 'debit';
      providerTxnId?: string;
      rawJson?: any;
    }>,
    provider: string,
    providerAccountId: string,
    connectionId: string,
    requiresReview: boolean = false,
  ): Promise<{ importedCount: number; skippedCount: number; importBatchId?: string }> {
    // Create import batch if review required
    let importBatchId: string | undefined;
    
    if (requiresReview) {
      const batch = await this.prisma.importBatch.create({
        data: {
          businessId,
          source: 'bank_connect',
          status: 'pending_review',
        },
      });
      importBatchId = batch.id;

      // Create import batch lines
      for (const tx of transactions) {
        await this.prisma.importBatchLine.create({
          data: {
            importBatchId: batch.id,
            date: tx.date,
            description: tx.description || 'Bank transaction',
            amount: tx.amount,
            direction: tx.direction,
          },
        });
      }

      return { importedCount: 0, skippedCount: 0, importBatchId: batch.id };
    }

    // Direct import (no review needed)
    let importedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      // Try provider transaction ID first
      if (tx.providerTxnId) {
        const existing = await this.prisma.transaction.findUnique({
          where: {
            transactions_business_provider_txnId_key: {
              businessId,
              provider,
              providerTxnId: tx.providerTxnId,
            },
          },
        });

        if (existing) {
          skippedCount++;
          continue;
        }
      }

      // Fallback to fingerprint
      const normalizedDesc = (tx.description || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
      const dateISO = tx.date.toISOString().split('T')[0];
      const fingerprint = crypto
        .createHash('sha256')
        .update(
          `${businessId}|${provider}|${providerAccountId}|${dateISO}|${tx.amount}|${normalizedDesc}`,
        )
        .digest('hex');

      // Check if transaction already exists
      const existing = await this.prisma.transaction.findUnique({
        where: { importFingerprint: fingerprint },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Create transaction
      try {
        await this.prisma.transaction.create({
          data: {
            businessId,
            type: tx.direction === 'credit' ? 'income' : 'expense',
            amount: tx.amount,
            currency: 'NGN',
            date: tx.date,
            description: tx.description || 'Bank transaction',
            source: 'import',
            importFingerprint: fingerprint,
            provider,
            providerTxnId: tx.providerTxnId || null,
          },
        });

        importedCount++;
      } catch (error: any) {
        // Skip if creation fails (might be duplicate by other means)
        skippedCount++;
      }
    }

    return { importedCount, skippedCount };
  }

  /**
   * Get all active connections eligible for auto-sync
   */
  async getConnectionsForAutoSync(): Promise<
    Array<{ id: string; businessId: string; userId: string }>
  > {
    // Get all active connections (limit to 200 per run)
    const connections = await this.prisma.bankConnection.findMany({
      where: {
        status: 'active',
      },
      take: 200,
      include: {
        business: {
          select: {
            ownerUserId: true,
          },
        },
      },
    });

    // Filter by feature access
    const eligible: Array<{
      id: string;
      businessId: string;
      userId: string;
    }> = [];

    for (const conn of connections) {
      try {
        const hasFeature = await this.plansService.hasFeature(
          conn.business.ownerUserId,
          conn.businessId,
          'bank_auto_sync',
        );

        if (hasFeature) {
          eligible.push({
            id: conn.id,
            businessId: conn.businessId,
            userId: conn.business.ownerUserId,
          });
        }
      } catch (error) {
        // Skip on error, continue with next connection
        continue;
      }
    }

    return eligible;
  }
}
