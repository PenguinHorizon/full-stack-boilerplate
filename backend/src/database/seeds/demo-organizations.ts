import { DeepPartial } from 'typeorm';
import { OrganizationRole, OrganizationStatus } from '@common/constants/tenancy.enums';
import { PageKey, SectionKey } from '@common/constants/website';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';

/*
 * Development-only demo data: one ORIGINAL demo tenant with a team covering
 * every role and enough website content to exercise the storefront.
 * Contact details use reserved example domains and non-dialable numbers on
 * purpose. Replace or extend freely for your own domain.
 */

export const DEMO_PASSWORD_DEFAULT = 'Password123';

export interface DemoWebsite {
  sections: Array<{ key: SectionKey; title?: string; subtitle?: string }>;
  testimonials: Array<{
    author: string;
    detail?: string;
    quote: string;
    rating?: number;
    source?: string;
  }>;
  faqs: Array<{ category: string; question: string; answer: string }>;
  pages: Array<{ key: PageKey; title: string; body: string }>;
}

export interface DemoOrganization {
  organization: DeepPartial<Organization>;
  settings: DeepPartial<OrganizationSettings>;
  website: DemoWebsite;
}

export interface DemoTeamMember {
  email: string;
  name: string;
  access: Array<{ organization: string; role: OrganizationRole }>;
}

export const DEMO_ORGANIZATIONS: DemoOrganization[] = [
  {
    organization: {
      slug: 'northern-trails',
      name: 'Northern Trails',
      status: OrganizationStatus.Active,
      tagline: 'Guided journeys through the mountains',
      shortDescription:
        'Small-group tours, treks and road trips planned by local guides.',
      description:
        'Northern Trails is a demo tenant for this boilerplate. Replace this text with your own story: who you are, where you travel and what makes your trips different.',
      brandPrimaryColor: '#1F6F8B',
      brandAccentColor: '#E9B44C',
      contactPhone: '+922100000000',
      contactEmail: 'hello@northern-trails.example',
      whatsappNumber: '+923000000000',
      addressLine: '1 Example Road',
      city: 'Islamabad',
      countryCode: 'PK',
      timezone: 'Asia/Karachi',
      currencyCode: 'PKR',
      locale: 'en-PK',
      socialLinks: { instagram: 'https://instagram.com/example' },
    },
    settings: {
      websiteEnabled: true,
      seoTitle: 'Northern Trails — Guided journeys through the mountains',
      seoDescription:
        'Small-group tours, treks and road trips planned by local guides.',
      footerText: 'Demo content — replace it in the admin portal.',
    },
    website: {
      sections: [
        { key: SectionKey.Hero },
        { key: SectionKey.Intro, title: 'About us' },
        { key: SectionKey.Gallery, title: 'From our trips' },
        { key: SectionKey.Testimonials, title: 'What travellers say' },
        { key: SectionKey.Faqs, title: 'Good to know' },
        { key: SectionKey.Contact, title: 'Get in touch' },
      ],
      testimonials: [
        {
          author: 'Ayesha K.',
          detail: 'Family trip',
          quote: 'Everything was organised down to the last detail. We will be back.',
          rating: 5,
        },
        {
          author: 'Daniel R.',
          detail: 'Solo traveller',
          quote: 'Friendly guides and a group that felt like friends by day two.',
          rating: 5,
        },
      ],
      faqs: [
        {
          category: 'Booking',
          question: 'How do I reserve a place?',
          answer:
            'Send us a message through the contact page and we will reply within a day.',
        },
        {
          category: 'Booking',
          question: 'Can I change my dates?',
          answer: 'Yes, up to 14 days before departure at no extra cost.',
        },
        {
          category: 'On the road',
          question: 'What should I pack?',
          answer: 'Layers, good walking shoes and a refillable water bottle.',
        },
      ],
      pages: [
        {
          key: PageKey.About,
          title: 'About Northern Trails',
          body: 'This is demo content for the About page.\n\nEdit it in the admin portal under Website → Pages.',
        },
        {
          key: PageKey.Privacy,
          title: 'Privacy policy',
          body: 'Demo privacy policy. Replace it with your own before going live.',
        },
        {
          key: PageKey.Terms,
          title: 'Terms and conditions',
          body: 'Demo terms. Replace them with your own before going live.',
        },
      ],
    },
  },
];

/** One account per role, so every permission set can be tried. */
export const DEMO_TEAM: DemoTeamMember[] = [
  {
    email: 'owner@northern-trails.example',
    name: 'Amina Raza',
    access: [{ organization: 'northern-trails', role: OrganizationRole.Owner }],
  },
  {
    email: 'admin@northern-trails.example',
    name: 'Hassan Ali',
    access: [{ organization: 'northern-trails', role: OrganizationRole.Admin }],
  },
  {
    email: 'manager@northern-trails.example',
    name: 'Sana Iqbal',
    access: [{ organization: 'northern-trails', role: OrganizationRole.Manager }],
  },
  {
    email: 'member@northern-trails.example',
    name: 'Usman Tariq',
    access: [{ organization: 'northern-trails', role: OrganizationRole.Member }],
  },
];
