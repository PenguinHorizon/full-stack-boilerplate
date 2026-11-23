import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PASSWORD_MESSAGE, PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from './users.dto';

const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @Transform(lowerTrim)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@example.com' })
  @Transform(lowerTrim)
  @IsEmail()
  email!: string;
}

/**
 * The reset token travels in the body, not the URL path: path segments end up
 * in access logs, proxy logs, and `Referer` headers.
 */
export class ResetPasswordDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  @MaxLength(128)
  token!: string;

  @ApiProperty({ type: String, minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @ApiProperty({ type: String, minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
