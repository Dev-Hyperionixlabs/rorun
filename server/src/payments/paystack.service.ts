import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface PaystackCustomer {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

interface PaystackInitializeTransaction {
  email: string;
  amount: number; // in kobo (smallest currency unit)
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface PaystackTransaction {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface PaystackCustomerResponse {
  id: number;
  email: string;
  customer_code: string;
}

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY not configured');
    }
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async createCustomer(data: PaystackCustomer): Promise<PaystackCustomerResponse> {
    try {
      const response = await axios.post<PaystackResponse<PaystackCustomerResponse>>(
        `${this.baseUrl}/customer`,
        data,
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        throw new BadRequestException(`Paystack error: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to create Paystack customer', error.response?.data || error.message);
      throw new BadRequestException('Failed to create Paystack customer');
    }
  }

  async getCustomerByEmail(email: string): Promise<PaystackCustomerResponse | null> {
    try {
      const response = await axios.get<PaystackResponse<PaystackCustomerResponse[]>>(
        `${this.baseUrl}/customer?email=${encodeURIComponent(email)}`,
        { headers: this.getHeaders() }
      );

      if (!response.data.status || !response.data.data || response.data.data.length === 0) {
        return null;
      }

      return response.data.data[0];
    } catch (error: any) {
      this.logger.error('Failed to get Paystack customer', error.response?.data || error.message);
      return null;
    }
  }

  async initializeTransaction(
    data: PaystackInitializeTransaction
  ): Promise<PaystackTransaction> {
    try {
      const response = await axios.post<PaystackResponse<PaystackTransaction>>(
        `${this.baseUrl}/transaction/initialize`,
        data,
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        throw new BadRequestException(`Paystack error: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to initialize Paystack transaction', error.response?.data || error.message);
      throw new BadRequestException('Failed to initialize payment');
    }
  }

  async verifyTransaction(reference: string): Promise<any> {
    try {
      const response = await axios.get<PaystackResponse<any>>(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.getHeaders() }
      );

      if (!response.data.status) {
        throw new BadRequestException(`Paystack error: ${response.data.message}`);
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to verify Paystack transaction', error.response?.data || error.message);
      throw new BadRequestException('Failed to verify transaction');
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }
}

