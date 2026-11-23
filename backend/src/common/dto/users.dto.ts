import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { OrganizationRole, OrganizationStatus } from '@common/constants/tenancy.enums';
import { OptionalNotNull } from '@common/dto/optional';

/*
 * Request DTOs for staff accounts, team memberships and platform admin.
 * Staff self-registration is gone: accounts are created by organization or
 * platform administrators.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;
export const PASSWORD_MESSAGE =
  'password must contain at least one lowercase letter, one uppercase letter and one digit';

/** E.164-ish: optional +, 7–15 digits. Per-country checks use libphonenumber (common/domain/phone.ts). */
export const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const lowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/* ── Self-service profile (PATCH /auth/me) ─────────────────────────── */

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Amina Khan' })
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '+923001234567' })
  @IsOptional()
  @Transform(emptyToNull)
  @Matches(PHONE_PATTERN, { message: 'phone must be a valid phone number' })
  phone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(500)
  avatar?: string | null;
}

/* ── Team (organization memberships) ─────────────────────────────────── */

export class AddTeamMemberDto {
  @ApiProperty({ example: 'guide@northern-trails.example' })
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Bilal Ahmed',
    description: 'Used when a new account is created',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @ApiPropertyOptional({
    minLength: PASSWORD_MIN_LENGTH,
    description: 'Required when no account exists for this email; ignored otherwise',
  })
  @OptionalNotNull()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password?: string;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ enum: OrganizationRole })
  @OptionalNotNull()
  @IsEnum(OrganizationRole)
  role?: OrganizationRole;

  @ApiPropertyOptional()
  @OptionalNotNull()
  @IsBoolean()
  isActive?: boolean;
}

/* ── Platform administration ───────────────────────────────────────── */

export class UpdatePlatformUserDto {
  @ApiPropertyOptional()
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @OptionalNotNull()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @OptionalNotNull()
  @IsBoolean()
  isSuperAdmin?: boolean;
}

export class OrganizationOwnerDto {
  @ApiProperty({ example: 'owner@new-place.example' })
  @Transform(lowerTrim)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Sara Malik' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Required when no account exists for this email',
  })
  @OptionalNotNull()
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(72)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_MESSAGE })
  password?: string;
}

export const SLUG_RULE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Silk Route Tours' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'silk-route-tours' })
  @Transform(lowerTrim)
  @IsString()
  @MaxLength(60)
  @Matches(SLUG_RULE, {
    message: 'slug may contain lower-case letters, numbers and single hyphens',
  })
  slug: string;

  @ApiProperty({ type: () => OrganizationOwnerDto })
  @ValidateNested()
  @Type(() => OrganizationOwnerDto)
  owner: OrganizationOwnerDto;
}

export class UpdatePlatformOrganizationDto {
  @ApiPropertyOptional()
  @OptionalNotNull()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @OptionalNotNull()
  @Transform(lowerTrim)
  @IsString()
  @MaxLength(60)
  @Matches(SLUG_RULE, {
    message: 'slug may contain lower-case letters, numbers and single hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ enum: OrganizationStatus })
  @OptionalNotNull()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus;
}
