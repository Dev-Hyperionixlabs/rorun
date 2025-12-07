import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Notify when deadlines are coming up soon' })
  @IsOptional()
  @IsBoolean()
  deadlineDueSoon?: boolean;

  @ApiPropertyOptional({ description: 'Notify when deadlines are very close' })
  @IsOptional()
  @IsBoolean()
  deadlineVerySoon?: boolean;

  @ApiPropertyOptional({ description: 'Send monthly reminders to log activity' })
  @IsOptional()
  @IsBoolean()
  monthlyReminder?: boolean;

  @ApiPropertyOptional({ description: 'Notify when high-value transactions are missing receipts' })
  @IsOptional()
  @IsBoolean()
  missingReceipts?: boolean;
}

