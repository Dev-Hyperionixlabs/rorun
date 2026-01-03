import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeedbackDto {
  @ApiProperty({ enum: ['open', 'resolved'], required: false })
  @IsEnum(['open', 'resolved'])
  @IsOptional()
  status?: 'open' | 'resolved';

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  adminNotes?: string;
}


