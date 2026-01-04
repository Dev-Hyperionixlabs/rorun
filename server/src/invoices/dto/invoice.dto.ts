import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

const TAX_TYPES = ['none', 'vat', 'wht', 'custom'] as const;
const TEMPLATE_KEYS = ['classic', 'modern', 'minimal'] as const;

class InvoiceItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Client ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ required: false, description: 'Optional job ID' })
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ required: false, default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, default: 'none', enum: TAX_TYPES })
  @IsEnum(TAX_TYPES as any)
  @IsOptional()
  taxType?: string;

  @ApiProperty({ required: false, description: 'Decimal rate in [0,1], e.g. 0.075 for 7.5%' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  taxRate?: number;

  @ApiProperty({ required: false, description: 'Tax label (e.g. VAT)' })
  @IsString()
  @IsOptional()
  taxLabel?: string;

  @ApiProperty({ required: false, enum: TEMPLATE_KEYS, description: 'Optional per-invoice template override' })
  @IsEnum(TEMPLATE_KEYS as any)
  @IsOptional()
  templateKey?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}

export class UpdateInvoiceDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  jobId?: string | null;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ required: false, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] })
  @IsEnum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false, default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ required: false, default: 'none', enum: TAX_TYPES })
  @IsEnum(TAX_TYPES as any)
  @IsOptional()
  taxType?: string;

  @ApiProperty({ required: false, description: 'Decimal rate in [0,1], e.g. 0.075 for 7.5%' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  taxRate?: number | null;

  @ApiProperty({ required: false, description: 'Tax label (e.g. VAT)' })
  @IsString()
  @IsOptional()
  taxLabel?: string | null;

  @ApiProperty({ required: false, enum: TEMPLATE_KEYS, description: 'Optional per-invoice template override (null clears to business default)' })
  @IsEnum(TEMPLATE_KEYS as any)
  @IsOptional()
  templateKey?: string | null;

  @ApiProperty({ required: false, type: [InvoiceItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];
}
