import { IsString, IsOptional, IsObject, IsBoolean, IsNumber, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ScopeDto {
  @ApiProperty()
  @IsNumber()
  periodDays: number;
}

export class ExchangeMonoDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsBoolean()
  consentAccepted: boolean;

  @ApiProperty()
  @ValidateNested()
  @Type(() => ScopeDto)
  scope: ScopeDto;

  @ApiProperty()
  @IsString()
  consentTextVersion: string;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  institution?: {
    name?: string;
  };

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  account?: {
    name?: string;
    mask?: string;
    currency?: string;
  };
}

