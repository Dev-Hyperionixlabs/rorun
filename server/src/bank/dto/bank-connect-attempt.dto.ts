import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BankConnectAttemptDto {
  @ApiProperty({ required: false, default: 'mono' })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiProperty()
  @IsBoolean()
  success: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;

  @ApiProperty({ required: false, example: 'NG' })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  countryCode?: string;
}


