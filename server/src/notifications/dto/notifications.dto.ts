import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsObject, IsEnum } from 'class-validator';

export class UpdateNotificationPreferenceDto {
  @ApiProperty({ enum: ['in_app', 'email', 'sms'] })
  @IsEnum(['in_app', 'email', 'sms'])
  channel: 'in_app' | 'email' | 'sms';

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  rulesJson?: {
    deadlineDays?: number[];
    dailyDigest?: boolean;
    quietHours?: {
      start: string;
      end: string;
      tz: string;
    };
  };
}

