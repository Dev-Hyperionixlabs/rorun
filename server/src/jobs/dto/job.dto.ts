import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateJobDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;
}


