import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateClientDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(4000)
  notes?: string;
}


