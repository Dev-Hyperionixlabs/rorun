import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const INVOICE_TEMPLATES = ['classic', 'modern', 'minimal'] as const;
const DEFAULT_TAX_TYPES = ['none', 'vat', 'wht', 'custom'] as const;

export class CreateBusinessDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  legalForm: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cacNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiProperty({ required: false, default: false })
  @IsBoolean()
  @IsOptional()
  vatRegistered?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  estimatedTurnoverBand?: string;

  // --- Tax Rules Engine profile fields (optional; nullable for existing businesses) ---
  @ApiProperty({ required: false, description: 'Annual turnover in NGN' })
  @IsNumber()
  @IsOptional()
  annualTurnoverNGN?: number;

  @ApiProperty({ required: false, description: 'Fixed assets value in NGN' })
  @IsNumber()
  @IsOptional()
  fixedAssetsNGN?: number;

  @ApiProperty({ required: false, description: 'Employee count' })
  @IsInt()
  @Min(0)
  @IsOptional()
  employeeCount?: number;

  @ApiProperty({ required: false, description: 'Accounting year end month (1–12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  accountingYearEndMonth?: number;

  @ApiProperty({ required: false, description: 'Accounting year end day (1–31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  accountingYearEndDay?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isProfessionalServices?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  claimsTaxIncentives?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isNonResident?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  sellsIntoNigeria?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  einvoicingEnabled?: boolean;

  // --- Invoice config (business-level defaults; all optional) ---
  @ApiProperty({ required: false, description: 'Invoice display name (overrides business.name)' })
  @IsString()
  @IsOptional()
  invoiceDisplayName?: string;

  @ApiProperty({ required: false, description: 'Invoice logo URL' })
  @IsString()
  @IsOptional()
  invoiceLogoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceAddressLine1?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceAddressLine2?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceCity?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceState?: string;

  @ApiProperty({ required: false, default: 'Nigeria' })
  @IsString()
  @IsOptional()
  invoiceCountry?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoicePostalCode?: string;

  @ApiProperty({ required: false, description: 'Footer note on invoices' })
  @IsString()
  @IsOptional()
  invoiceFooterNote?: string;

  @ApiProperty({ required: false, default: 'classic', enum: INVOICE_TEMPLATES })
  @IsIn(INVOICE_TEMPLATES as any)
  @IsOptional()
  invoiceTemplateKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentBankName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentAccountName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentAccountNumber?: string;

  @ApiProperty({ required: false, description: 'Freeform payment instructions note' })
  @IsString()
  @IsOptional()
  paymentInstructionsNote?: string;

  @ApiProperty({ required: false, default: 'none', enum: DEFAULT_TAX_TYPES })
  @IsIn(DEFAULT_TAX_TYPES as any)
  @IsOptional()
  defaultTaxType?: string;

  @ApiProperty({ required: false, description: 'Decimal rate in [0,1], e.g. 0.075 for 7.5%' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultTaxRate?: number;

  @ApiProperty({ required: false, description: 'Default tax label (e.g., VAT)' })
  @IsString()
  @IsOptional()
  defaultTaxLabel?: string;
}

export class UpdateBusinessDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  legalForm?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  sector?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  cacNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  vatRegistered?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  estimatedTurnoverBand?: string;

  @ApiProperty({ required: false, description: 'Annual turnover in NGN' })
  @IsNumber()
  @IsOptional()
  annualTurnoverNGN?: number;

  @ApiProperty({ required: false, description: 'Fixed assets value in NGN' })
  @IsNumber()
  @IsOptional()
  fixedAssetsNGN?: number;

  @ApiProperty({ required: false, description: 'Employee count' })
  @IsInt()
  @Min(0)
  @IsOptional()
  employeeCount?: number;

  @ApiProperty({ required: false, description: 'Accounting year end month (1–12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  accountingYearEndMonth?: number;

  @ApiProperty({ required: false, description: 'Accounting year end day (1–31)' })
  @IsInt()
  @Min(1)
  @Max(31)
  @IsOptional()
  accountingYearEndDay?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isProfessionalServices?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  claimsTaxIncentives?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isNonResident?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  sellsIntoNigeria?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  einvoicingEnabled?: boolean;

  // --- Invoice config (business-level defaults; all optional) ---
  @ApiProperty({ required: false, description: 'Invoice display name (overrides business.name)' })
  @IsString()
  @IsOptional()
  invoiceDisplayName?: string;

  @ApiProperty({ required: false, description: 'Invoice logo URL' })
  @IsString()
  @IsOptional()
  invoiceLogoUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceAddressLine1?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceAddressLine2?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceCity?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoiceState?: string;

  @ApiProperty({ required: false, default: 'Nigeria' })
  @IsString()
  @IsOptional()
  invoiceCountry?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  invoicePostalCode?: string;

  @ApiProperty({ required: false, description: 'Footer note on invoices' })
  @IsString()
  @IsOptional()
  invoiceFooterNote?: string;

  @ApiProperty({ required: false, default: 'classic', enum: INVOICE_TEMPLATES })
  @IsIn(INVOICE_TEMPLATES as any)
  @IsOptional()
  invoiceTemplateKey?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentBankName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentAccountName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentAccountNumber?: string;

  @ApiProperty({ required: false, description: 'Freeform payment instructions note' })
  @IsString()
  @IsOptional()
  paymentInstructionsNote?: string;

  @ApiProperty({ required: false, default: 'none', enum: DEFAULT_TAX_TYPES })
  @IsIn(DEFAULT_TAX_TYPES as any)
  @IsOptional()
  defaultTaxType?: string;

  @ApiProperty({ required: false, description: 'Decimal rate in [0,1], e.g. 0.075 for 7.5%' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  defaultTaxRate?: number;

  @ApiProperty({ required: false, description: 'Default tax label (e.g., VAT)' })
  @IsString()
  @IsOptional()
  defaultTaxLabel?: string;
}
