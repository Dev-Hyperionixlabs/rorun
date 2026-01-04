import { IsString, IsOptional, IsBoolean, IsInt, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
