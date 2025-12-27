import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailProvider {
  private apiKey: string | null = null;
  private provider: 'resend' | 'postmark' | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('EMAIL_PROVIDER_KEY') || null;
    this.provider = (this.configService.get<string>('EMAIL_PROVIDER') || 'resend') as 'resend' | 'postmark';
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.apiKey) {
      // In development, just log
      console.log(`[Email Provider] Would send email to ${options.to}: ${options.subject}`);
      return { success: true, messageId: 'dev-log' };
    }

    try {
      if (this.provider === 'resend') {
        return await this.sendViaResend(options);
      } else if (this.provider === 'postmark') {
        return await this.sendViaPostmark(options);
      } else {
        throw new Error(`Unknown email provider: ${this.provider}`);
      }
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Email send failed',
      };
    }
  }

  private async sendViaResend(options: EmailOptions) {
    const from = this.configService.get<string>('EMAIL_FROM') || 'noreply@rorun.app';
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      success: true,
      messageId: response.data.id,
    };
  }

  private async sendViaPostmark(options: EmailOptions) {
    const from = this.configService.get<string>('EMAIL_FROM') || 'noreply@rorun.app';
    const response = await axios.post(
      'https://api.postmarkapp.com/email',
      {
        From: from,
        To: options.to,
        Subject: options.subject,
        HtmlBody: options.html,
        TextBody: options.text || options.html.replace(/<[^>]*>/g, ''),
      },
      {
        headers: {
          'X-Postmark-Server-Token': this.apiKey!,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      success: true,
      messageId: response.data.MessageID,
    };
  }
}

