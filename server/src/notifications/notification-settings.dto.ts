import { IsBoolean } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsBoolean()
  deadlineDueSoon: boolean;

  @IsBoolean()
  deadlineVerySoon: boolean;

  @IsBoolean()
  monthlyReminder: boolean;

  @IsBoolean()
  missingReceipts: boolean;
}
