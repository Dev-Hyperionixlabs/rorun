import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsObject } from 'class-validator';

export class StartFilingWizardDto {
  @ApiProperty({ example: 2024 })
  @IsNumber()
  taxYear: number;

  @ApiProperty({ example: 'annual_return_prep', required: false })
  @IsString()
  @IsOptional()
  kind?: string;
}

export class GetFilingRunDto {
  @ApiProperty({ example: 2024, required: false })
  @IsNumber()
  @IsOptional()
  taxYear?: number;

  @ApiProperty({ example: 'annual_return_prep', required: false })
  @IsString()
  @IsOptional()
  kind?: string;
}

export class UpdateStepDto {
  @ApiProperty({ example: 2024 })
  @IsNumber()
  taxYear: number;

  @ApiProperty({ example: 'annual_return_prep' })
  @IsString()
  kind: string;

  @ApiProperty({ example: 'income' })
  @IsString()
  step: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  answersPatch?: {
    incomeAdjustments?: number;
    expenseAdjustments?: number;
    incomeAdjustmentNote?: string;
    expenseAdjustmentNote?: string;
  };
}

export class CompleteFilingRunDto {
  @ApiProperty({ example: 2024 })
  @IsNumber()
  taxYear: number;

  @ApiProperty({ example: 'annual_return_prep', required: false })
  @IsString()
  @IsOptional()
  kind?: string;
}

