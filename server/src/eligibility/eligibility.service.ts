import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessesService } from '../businesses/businesses.service';

@Injectable()
export class EligibilityService {
  constructor(
    private prisma: PrismaService,
    private businessesService: BusinessesService,
  ) {}

  async evaluateEligibility(businessId: string, userId: string, year?: number) {
    const business = await this.businessesService.findOne(businessId, userId);
    const taxYear = year || new Date().getFullYear();

    // Get current year tax rules
    const citRules = await this.prisma.taxRule.findMany({
      where: {
        taxType: 'CIT',
        year: taxYear,
      },
    });

    const vatRules = await this.prisma.taxRule.findMany({
      where: {
        taxType: 'VAT',
        year: taxYear,
      },
    });

    // Evaluate CIT status
    const citStatus = this.evaluateCitStatus(business, citRules);

    // Evaluate VAT status
    const vatStatus = this.evaluateVatStatus(business, vatRules);

    // WHT is informational (no hard 0% rule)
    const whtStatus = 'informational';

    const eligibilityDetail = {
      cit: {
        status: citStatus.status,
        explanation: citStatus.explanation,
      },
      vat: {
        status: vatStatus.status,
        explanation: vatStatus.explanation,
      },
      wht: {
        status: whtStatus,
        explanation: 'Withholding Tax obligations depend on transaction types and counterparties.',
      },
    };

    // Create or update tax profile
    const taxProfile = await this.prisma.taxProfile.upsert({
      where: {
        businessId_taxYear: {
          businessId,
          taxYear,
        },
      },
      create: {
        businessId,
        taxYear,
        citStatus: citStatus.status,
        vatStatus: vatStatus.status,
        whtStatus,
        eligibilityDetailJson: eligibilityDetail,
      },
      update: {
        citStatus: citStatus.status,
        vatStatus: vatStatus.status,
        whtStatus,
        eligibilityDetailJson: eligibilityDetail,
      },
    });

    return taxProfile;
  }

  private evaluateCitStatus(business: any, rules: any[]) {
    // Simplified CIT evaluation logic
    // In production, this would be more sophisticated
    const turnoverBand = business.estimatedTurnoverBand;

    // Example: Small companies (< 25M) may be exempt
    if (turnoverBand === 'micro' || turnoverBand === 'small') {
      return {
        status: 'exempt',
        explanation: 'Your business falls under the small business exemption for CIT.',
      };
    }

    // Check rules
    for (const rule of rules) {
      if (this.matchesRule(business, rule)) {
        return {
          status: rule.resultJson.status || 'liable',
          explanation: rule.resultJson.explanation || 'CIT obligations apply.',
        };
      }
    }

    return {
      status: 'liable',
      explanation: 'CIT obligations may apply. Consult with a tax advisor.',
    };
  }

  private evaluateVatStatus(business: any, rules: any[]) {
    if (business.vatRegistered) {
      return {
        status: 'registered',
        explanation: 'Your business is VAT registered and must file VAT returns.',
      };
    }

    const turnoverBand = business.estimatedTurnoverBand;

    // Example: VAT registration threshold
    if (turnoverBand === 'micro') {
      return {
        status: 'not_required',
        explanation: 'Your business is below the VAT registration threshold.',
      };
    }

    for (const rule of rules) {
      if (this.matchesRule(business, rule)) {
        return {
          status: rule.resultJson.status || 'may_require',
          explanation: rule.resultJson.explanation || 'VAT registration may be required.',
        };
      }
    }

    return {
      status: 'may_require',
      explanation: 'VAT registration may be required based on turnover. Monitor your revenue.',
    };
  }

  private matchesRule(business: any, rule: any): boolean {
    // Simplified rule matching
    // In production, this would parse conditionExpression
    if (rule.thresholdMin && rule.thresholdMax) {
      // Would need to compare with actual turnover
      return true; // Simplified
    }
    return true; // Simplified matching
  }

  async getTaxProfile(businessId: string, userId: string, year: number) {
    await this.businessesService.findOne(businessId, userId);

    const taxProfile = await this.prisma.taxProfile.findUnique({
      where: {
        businessId_taxYear: {
          businessId,
          taxYear: year,
        },
      },
    });

    if (!taxProfile) {
      // Auto-evaluate if not exists
      return this.evaluateEligibility(businessId, userId, year);
    }

    return taxProfile;
  }
}
