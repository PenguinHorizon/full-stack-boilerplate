import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BannerPlacement,
  ContentStatus,
  InquiryStatus,
  SectionKey,
} from '@common/constants/website';
import { ListQueryDto } from '@common/dto/list-query.dto';

/*
 * Website editors and the inbox. Create bodies need the
 * required fields; PATCH bodies take any subset (no field initialisers, so
 * an omitted field is never reset).
 */

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const blankToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;
/** A site path ("/menu") or an https link. */
const LINK = /^(\/[^\s]*|https:\/\/[^\s]+)$/;

export class SectionInputDto {
  @ApiProperty({ enum: SectionKey, enumName: 'SectionKey' })
  @IsEnum(SectionKey)
  key: SectionKey;

  @ApiProperty() @IsBoolean() isEnabled: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(160)
  title?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(300)
  subtitle?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Items shown (1–24)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  limit?: number | null;
}

/** PUT /content/sections: every section, in the order to show them. */
export class SectionsInputDto {
  @ApiProperty({ type: () => [SectionInputDto] })
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SectionInputDto)
  sections: SectionInputDto[];
}

export class BannerInputDto {
  @ApiProperty({ enum: BannerPlacement, enumName: 'BannerPlacement' })
  @IsEnum(BannerPlacement)
  placement: BannerPlacement;

  @ApiProperty({ example: 'Winter warmer hero' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Name it so you can find it later' })
  @MaxLength(120)
  internalName: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(160)
  headline?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(300)
  subheadline?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(40)
  ctaLabel?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '/menu' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(500)
  @Matches(LINK, { message: 'Use a page like /menu or an https:// link' })
  ctaUrl?: string | null;

  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) desktopMediaId: number;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mobileMediaId?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
export class UpdateBannerDto extends PartialType(BannerInputDto) {}

export class GalleryInputDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) mediaId: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(255)
  caption?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Dining room' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(40)
  tag?: string | null;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
export class UpdateGalleryDto extends PartialType(GalleryInputDto) {}

export class TestimonialInputDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Who said it?' })
  @MaxLength(120)
  authorName: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Regular since 2021' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(120)
  authorDetail?: string | null;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Add the quote' })
  @MaxLength(2000)
  quote: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Google' })
  @IsOptional()
  @Transform(blankToNull)
  @IsString()
  @MaxLength(40)
  source?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  avatarMediaId?: number | null;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
export class UpdateTestimonialDto extends PartialType(TestimonialInputDto) {}

export class FaqInputDto {
  @ApiProperty({ example: 'Ordering' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Choose a category' })
  @MaxLength(60)
  category: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Write the question' })
  @MaxLength(255)
  question: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Write the answer' })
  @MaxLength(4000)
  answer: string;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}
export class UpdateFaqDto extends PartialType(FaqInputDto) {}

export class OrderItemDto {
  @ApiProperty() @Type(() => Number) @IsInt() @Min(1) id: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) @Max(100_000) sortOrder: number;
}

export class ReorderDto {
  @ApiProperty({ type: () => [OrderItemDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class PageInputDto {
  @ApiProperty({ example: 'Our story' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Give the page a title' })
  @MaxLength(160)
  title: string;

  @ApiProperty({ description: 'Page text format (ADR-020)' })
  @IsString()
  @MaxLength(50_000)
  body: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  heroMediaId?: number | null;

  @ApiProperty({ enum: ContentStatus, enumName: 'ContentStatus' })
  @IsEnum(ContentStatus)
  status: ContentStatus;
}

export class ContentListQueryDto {
  @ApiPropertyOptional({ enum: BannerPlacement, enumName: 'BannerPlacement' })
  @IsOptional()
  @IsEnum(BannerPlacement)
  placement?: BannerPlacement;
}

export class InquiryListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: InquiryStatus, enumName: 'InquiryStatus' })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;
}

export class UpdateInquiryDto {
  @ApiProperty({
    enum: [InquiryStatus.Read, InquiryStatus.New, InquiryStatus.Archived],
  })
  @IsIn([InquiryStatus.Read, InquiryStatus.New, InquiryStatus.Archived])
  status: InquiryStatus;
}
