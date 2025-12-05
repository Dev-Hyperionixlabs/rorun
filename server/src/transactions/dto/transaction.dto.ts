import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateTransactionDto {
  @ApiProperty({ enum: ['income', 'expense'] })
  @IsEnum(['income', 'expense'])
  type: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false, default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false, enum: ['manual', 'upload', 'import'], default: 'manual' })
  @IsEnum(['manual', 'upload', 'import'])
  @IsOptional()
  source?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isBusinessFlag?: boolean;
}

export class UpdateTransactionDto {
  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isBusinessFlag?: boolean;
}

export class TransactionQueryDto {
  @ApiProperty({ required: false, enum: ['income', 'expense'] })
  @IsEnum(['income', 'expense'])
  @IsOptional()
  type?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minAmount?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxAmount?: number;

  @ApiProperty({ required: false, default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number;

  @ApiProperty({ required: false, default: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  take?: number;
}

