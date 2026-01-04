import {
  IsString,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

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

  @ApiProperty({ required: false, type: [InvoiceItemDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];
}
