import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @ApiProperty({ enum: ['new', 'triaged', 'done'], required: false })
  @IsEnum(['new', 'triaged', 'done'])
  @IsOptional()
  status?: 'new' | 'triaged' | 'done';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  adminNotes?: string;
}


