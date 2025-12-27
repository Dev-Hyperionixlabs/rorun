import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsObject, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export class CreateTaxRuleSetDto {
  @ApiProperty({ example: '2026.1' })
  @IsString()
  version: string;

  @ApiProperty({ example: 'Nigeria SME Tax Reform 2026 - v1' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-01-01T00:00:00Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTaxRuleSetDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: ['draft', 'active', 'archived'], required: false })
  @IsEnum(['draft', 'active', 'archived'])
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateTaxRuleDto {
  @ApiProperty({ example: 'cit_eligibility_small_business' })
  @IsString()
  key: string;

  @ApiProperty({ enum: ['eligibility', 'obligation', 'deadline', 'threshold'] })
  @IsEnum(['eligibility', 'obligation', 'deadline', 'threshold'])
  type: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  priority: number;

  @ApiProperty()
  @IsObject()
  conditionsJson: any;

  @ApiProperty()
  @IsObject()
  outcomeJson: any;

  @ApiProperty()
  @IsString()
  explanation: string;
}

export class CreateDeadlineTemplateDto {
  @ApiProperty({ example: 'annual_return' })
  @IsString()
  key: string;

  @ApiProperty({ enum: ['monthly', 'quarterly', 'annual', 'one_time'] })
  @IsEnum(['monthly', 'quarterly', 'annual', 'one_time'])
  frequency: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  dueDayOfMonth?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  dueMonth?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  dueDay?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  offsetDays?: number;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  appliesWhenJson?: any;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;
}

export class TestEvaluationDto {
  @ApiProperty()
  @IsObject()
  businessProfile: any;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  taxYear?: number;
}

