import { IsString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ enum: ['receipt', 'bank_statement', 'other'] })
  @IsEnum(['receipt', 'bank_statement', 'other'])
  type: string;

  @ApiProperty()
  @IsString()
  storageUrl: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiProperty()
  @IsInt()
  size: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  relatedTransactionId?: string;
}

export class UpdateDocumentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  relatedTransactionId?: string;
}

