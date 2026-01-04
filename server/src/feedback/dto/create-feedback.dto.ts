import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeedbackDto {
  @ApiProperty({ required: false, enum: ['bug', 'idea', 'question'], example: 'bug' })
  @IsString()
  @IsOptional()
  category?: 'bug' | 'idea' | 'question';

  @ApiProperty({ example: 'I got stuck after onboarding — the dashboard kept loading.' })
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message: string;

  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsEmail()
  @IsOptional()
  userEmail?: string;

  @ApiProperty({ required: false, example: 'https://rorun.ng/app/dashboard' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  pageUrl?: string;

  @ApiProperty({ required: false, example: 'business-uuid' })
  @IsString()
  @IsOptional()
  businessId?: string;
}


