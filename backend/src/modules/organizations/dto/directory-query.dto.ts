import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ListQueryDto } from '@common/dto/list-query.dto';

const trimmed = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class DirectoryQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ example: 'Karachi' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trimmed)
  city?: string;
}

export class ResolveSiteQueryDto {
  @ApiProperty({ example: 'northern-trails.localhost:5173' })
  @IsString()
  @MaxLength(260)
  @Matches(/^[A-Za-z0-9.-]+(:\d{1,5})?$/, { message: 'host must be a host name' })
  host: string;
}

/** Caddy's on-demand TLS `ask` sends `?domain=` (deploy/Caddyfile). */
export class TlsCheckQueryDto {
  @ApiProperty({ example: 'northern-trails.example.com' })
  @IsString()
  @MaxLength(253)
  @Matches(/^[A-Za-z0-9.-]+$/, { message: 'domain must be a host name' })
  domain: string;
}
