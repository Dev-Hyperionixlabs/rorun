import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NormalizedTransaction {
  date: Date;
  description: string;
  amount: number;
  direction: 'credit' | 'debit';
  balance?: number;
  providerTxnId?: string;
  rawJson?: any;
}

@Injectable()
export class MonoProvider {
  private readonly logger = new Logger(MonoProvider.name);
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly environment: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.publicKey = this.configService.get<string>('MONO_PUBLIC_KEY') || '';
    this.secretKey = this.configService.get<string>('MONO_SECRET_KEY') || '';
    this.environment = this.configService.get<string>('MONO_ENV') || 'sandbox';
    this.baseUrl =
      this.environment === 'live'
        ? 'https://api.withmono.com'
        : 'https://api.sandbox.withmono.com';
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getEnvironment(): string {
    return this.environment;
  }

  /**
   * Exchange Mono Connect code for account ID
   */
  async exchangeCodeForAccountId(code: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/account/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'mono-sec-key': this.secretKey,
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Mono exchange failed: ${error.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data?.id || data.id;
    } catch (error: any) {
      this.logger.error(`Failed to exchange Mono code: ${error.message}`, error.stack);
      throw new Error(`Mono exchange failed: ${error.message}`);
    }
  }

  /**
   * Fetch account information
   */
  async fetchAccountInfo(accountId: string): Promise<{
    institution?: { name?: string };
    account?: { name?: string; mask?: string; currency?: string };
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/accounts/${accountId}`, {
        headers: {
          'mono-sec-key': this.secretKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch account info: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        institution: data.data?.institution || data.institution,
        account: data.data?.account || data.account,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch account info: ${error.message}`, error.stack);
      return {};
    }
  }

  /**
   * Fetch transactions/statements from Mono
   */
  async fetchStatement(
    accountId: string,
    from?: Date,
    to?: Date,
  ): Promise<NormalizedTransaction[]> {
    try {
      const params = new URLSearchParams();
      if (from) {
        params.append('start', from.toISOString().split('T')[0]);
      }
      if (to) {
        params.append('end', to.toISOString().split('T')[0]);
      }

      const url = `${this.baseUrl}/v1/accounts/${accountId}/transactions${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'mono-sec-key': this.secretKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();
      const transactions = data.data || data.transactions || [];

      return transactions.map((tx: any) => {
        // Mono transaction format:
        // - type: "debit" or "credit"
        // - amount: number (positive)
        // - narration: string
        // - date: ISO string
        // - _id: transaction ID
        const amount = Math.abs(Number(tx.amount) || 0);
        const type = tx.type?.toLowerCase() || 'debit';
        
        return {
          date: new Date(tx.date || tx.transaction_date),
          description: tx.narration || tx.description || '',
          amount,
          direction: type === 'credit' ? 'credit' : 'debit',
          balance: tx.balance ? Number(tx.balance) : undefined,
          providerTxnId: tx._id || tx.id || undefined,
          rawJson: tx,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to fetch statement: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch statement: ${error.message}`);
    }
  }
}

