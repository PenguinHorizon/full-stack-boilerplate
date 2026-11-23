/*
 * Public-website content vocabularies, matching the ENUM columns in the
 * website_* tables.
 */

/** Home sections, in their default order. Add domain sections here. */
export enum SectionKey {
  Hero = 'hero',
  Intro = 'intro',
  Gallery = 'gallery',
  Testimonials = 'testimonials',
  Faqs = 'faqs',
  Contact = 'contact',
}

export const DEFAULT_SECTION_ORDER: SectionKey[] = Object.values(SectionKey);

export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
}

export enum BannerPlacement {
  Hero = 'hero',
  Home = 'home',
}

export enum PageKey {
  About = 'about',
  Privacy = 'privacy',
  Terms = 'terms',
}

export enum InquiryStatus {
  New = 'new',
  Read = 'read',
  Archived = 'archived',
}
