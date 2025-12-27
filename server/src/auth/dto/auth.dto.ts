import { IsString, IsNotEmpty, Matches, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestOtpDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;
}

export class LoginDto {
  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiProperty({ required: false, example: 'Efe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false, example: 'efe@company.com' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
