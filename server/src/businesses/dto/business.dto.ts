import { IsString, IsOptional, IsBoolean } from 'class-validator';
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
}

