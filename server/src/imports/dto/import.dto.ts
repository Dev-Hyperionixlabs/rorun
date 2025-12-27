import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateImportDto {
  @ApiProperty({ enum: ['csv', 'paste', 'pdf'] })
  @IsEnum(['csv', 'paste', 'pdf'])
  sourceType: 'csv' | 'paste' | 'pdf';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  documentId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  rawText?: string;
}

export class ApproveImportDto {
  @ApiProperty({ type: [String] })
  lineIds: string[];
}

