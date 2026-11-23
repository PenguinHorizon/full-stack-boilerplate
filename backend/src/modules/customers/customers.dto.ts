import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CustomerStatus } from '@common/constants/customers';
import { ListQueryDto } from '@common/dto/list-query.dto';
import { OptionalNotNull } from '@common/dto/optional';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

/** Customers: at least 8 characters with a letter and a number. */
export const CUSTOMER_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_HINT = 'Use at least 8 characters with a letter and a number';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'Ayesha Khan' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tell us your name' })
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: '0300 1234567' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter your phone number' })
  @MaxLength(30)
  phone: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string | null = null;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MaxLength(128)
  @Matches(CUSTOMER_PASSWORD_PATTERN, { message: PASSWORD_HINT })
  password: string;
}

export class LoginCustomerDto {
  @ApiProperty({ description: 'Phone number or email', example: '0300 1234567' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Enter your phone number or email' })
  @MaxLength(255)
  identifier: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Enter your password' })
  @MaxLength(128)
  password: string;
}

export class CustomerForgotPasswordDto {
  @ApiProperty()
  @Transform(trim)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email: string;
}

export class CustomerResetPasswordDto {
  @ApiProperty() @IsString() @MinLength(20) @MaxLength(200) token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MaxLength(128)
  @Matches(CUSTOMER_PASSWORD_PATTERN, { message: PASSWORD_HINT })
  password: string;
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional()
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Tell us your name' })
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(255)
  email?: string | null;
}

export class ChangeCustomerPasswordDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128) currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MaxLength(128)
  @Matches(CUSTOMER_PASSWORD_PATTERN, { message: PASSWORD_HINT })
  newPassword: string;
}

/* ── Staff: customer management ───────────────────────────────────── */

export class CustomerListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: CustomerStatus, enumName: 'CustomerStatus' })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  hasAccount?: 'true' | 'false';
}

export class UpdateCustomerAdminDto {
  @ApiPropertyOptional({ enum: CustomerStatus, enumName: 'CustomerStatus' })
  @OptionalNotNull()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(255)
  blockedReason?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(2000)
  adminNotes?: string | null;
}
