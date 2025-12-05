import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty({ enum: ['android', 'ios'] })
  @IsEnum(['android', 'ios'])
  platform: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  pushToken?: string;
}

