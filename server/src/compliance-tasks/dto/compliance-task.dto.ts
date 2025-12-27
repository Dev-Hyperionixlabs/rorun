import { IsString, IsOptional, IsInt, IsBoolean, IsDateString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TaskQueryDto {
  @ApiProperty({ required: false })
  @IsInt()
  @IsOptional()
  taxYear?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiProperty({ required: false, default: 50 })
  @IsInt()
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsInt()
  @IsOptional()
  offset?: number;
}

export class AddEvidenceDto {
  @ApiProperty()
  @IsString()
  documentId: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

