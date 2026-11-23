import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ContentStatus } from '@common/constants/website';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN } from '@common/dto/users.dto';
import { hashPassword } from '@common/helpers/password.helper';
import { OrganizationUser } from '@database/entities/identity/organization-user.entity';
import { User } from '@database/entities/identity/user.entity';
import { SystemSettings } from '@database/entities/platform/system-settings.entity';
import { Organization } from '@database/entities/tenancy/organization.entity';
import { OrganizationSettings } from '@database/entities/tenancy/organization-settings.entity';
import {
  Faq,
  SitePage,
  Testimonial,
  WebsiteSection,
} from '@database/entities/website/content.entity';
import {
  DEMO_PASSWORD_DEFAULT,
  DEMO_ORGANIZATIONS,
  DEMO_TEAM,
  DemoWebsite,
} from './demo-organizations';

const DEFAULT_ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

/**
 * Why a super-admin password must not be seeded in production, or null.
 * Refuses the development default, the env templates' placeholders and
 * anything the platform's own password rules would reject.
 */
export function productionSeedPasswordProblem(password: string): string | null {
  if (password === DEFAULT_ADMIN_PASSWORD) {
    return 'Refusing to seed the default admin password in production. Set SEED_ADMIN_PASSWORD.';
  }
  if (/change_?me|replace_?me/i.test(password)) {
    return 'SEED_ADMIN_PASSWORD is still a placeholder. Set a real password.';
  }
  if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_PATTERN.test(password)) {
    return `SEED_ADMIN_PASSWORD must be at least ${PASSWORD_MIN_LENGTH} characters with upper- and lowercase letters and a digit.`;
  }
  return null;
}

/**
 * Idempotent data seeding. Schema is the migrations' job — this only inserts
 * rows that don't already exist, so it is safe to re-run.
 */
@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(SystemSettings)
    private readonly settingsRepository: Repository<SystemSettings>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async seed() {
    this.logger.log('Starting database seeding...');
    await this.seedAdminUser();
    await this.seedDefaultSettings();
    await this.seedDemoOrganizations();
    await this.seedDemoTeam();
    this.logger.log('Database seeding completed.');
  }

  private async seedAdminUser() {
    const email = this.config.get<string>('SEED_ADMIN_EMAIL') ?? DEFAULT_ADMIN_EMAIL;
    const password =
      this.config.get<string>('SEED_ADMIN_PASSWORD') ?? DEFAULT_ADMIN_PASSWORD;

    // Refuse to create a well-known account with a well-known password in prod.
    if (this.config.get<string>('NODE_ENV') === 'production') {
      const problem = productionSeedPasswordProblem(password);
      if (problem) throw new Error(problem);
    }

    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      // Make sure the seeded platform admin keeps platform access.
      if (!existing.isSuperAdmin) {
        await this.usersRepository.update(existing.id, { isSuperAdmin: true });
      }
      this.logger.log(`Admin user ${email} already exists.`);
      return;
    }

    const user = await this.usersRepository.save(
      this.usersRepository.create({
        name: 'System Admin',
        email,
        password: await hashPassword(password),
        isSuperAdmin: true,
        isActive: true,
      }),
    );

    await this.usersRepository.update(user.id, {
      userCode: `USR${String(user.id).padStart(6, '0')}`,
    });

    this.logger.log(`Created admin user ${email}.`);
  }

  private async seedDefaultSettings() {
    const defaults = [
      {
        key: 'appName',
        value: 'Generic Platform',
        group: 'general',
        description: 'Application display name',
      },
      {
        key: 'appEmail',
        value: 'admin@example.com',
        group: 'general',
        description: 'Application contact email',
      },
      {
        key: 'supportUrl',
        value: '/support',
        group: 'general',
        description: 'Support page URL',
      },
      {
        key: 'sessionTimeout',
        value: '60',
        group: 'security',
        description: 'Session timeout in minutes',
      },
      {
        key: 'mfaRequired',
        value: 'false',
        group: 'security',
        description: 'Require 2FA for all admins',
      },
      {
        key: 'notif_user_registration',
        value: 'true',
        group: 'notifications',
        description: 'Notify on user registration',
      },
    ];

    for (const setting of defaults) {
      const exists = await this.settingsRepository.findOne({
        where: { key: setting.key },
      });
      if (!exists) {
        await this.settingsRepository.save(this.settingsRepository.create(setting));
      }
    }

    this.logger.log('Default system settings seeded.');
  }

  /**
   * Development-only demo tenants, each created with its settings row and
   * website content in one transaction, and skipped if the slug already
   * exists, so re-running never duplicates or overwrites.
   */
  private async seedDemoOrganizations() {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.log('Skipping demo data in production.');
      return;
    }

    for (const demo of DEMO_ORGANIZATIONS) {
      const slug = String(demo.organization.slug);
      const created = await this.dataSource.transaction(async (manager) => {
        const organizations = manager.getRepository(Organization);
        const existing = await organizations.findOne({
          where: { slug },
          withDeleted: true,
        });
        if (existing) return false;

        const organization = await organizations.save(
          organizations.create(demo.organization),
        );
        await manager
          .getRepository(OrganizationSettings)
          .save({ ...demo.settings, organizationId: organization.id });
        await this.insertDemoWebsite(manager, organization.id, demo.website);
        return true;
      });

      this.logger.log(
        created
          ? `Created demo tenant "${slug}".`
          : `Demo tenant "${slug}" already exists.`,
      );
    }
  }

  private async insertDemoWebsite(
    manager: EntityManager,
    organizationId: number,
    demo: DemoWebsite,
  ) {
    const published = ContentStatus.Published;
    await manager.insert(
      WebsiteSection,
      demo.sections.map((section, index) => ({
        organizationId,
        sectionKey: section.key,
        isEnabled: true,
        sortOrder: index,
        title: section.title ?? null,
        subtitle: section.subtitle ?? null,
      })),
    );
    await manager.insert(
      Testimonial,
      demo.testimonials.map((item, index) => ({
        organizationId,
        authorName: item.author,
        authorDetail: item.detail ?? null,
        quote: item.quote,
        rating: item.rating ?? null,
        source: item.source ?? null,
        status: published,
        sortOrder: index,
      })),
    );
    await manager.insert(
      Faq,
      demo.faqs.map((item, index) => ({
        organizationId,
        category: item.category,
        question: item.question,
        answer: item.answer,
        status: published,
        sortOrder: index,
      })),
    );
    await manager.insert(
      SitePage,
      demo.pages.map((page) => ({
        organizationId,
        pageKey: page.key,
        title: page.title,
        body: page.body,
        status: published,
        publishedAt: new Date(),
      })),
    );
  }

  /** One staff account per role in the demo tenants (development only). */
  private async seedDemoTeam() {
    if (this.config.get<string>('NODE_ENV') === 'production') return;
    const password = await hashPassword(
      this.config.get<string>('SEED_DEMO_PASSWORD') ?? DEMO_PASSWORD_DEFAULT,
    );

    for (const member of DEMO_TEAM) {
      await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(User);
        let user = await users.findOne({
          where: { email: member.email },
          withDeleted: true,
        });
        if (!user) {
          user = await users.save(
            users.create({
              name: member.name,
              email: member.email,
              password,
              isActive: true,
            }),
          );
          await users.update(user.id, {
            userCode: `USR${String(user.id).padStart(6, '0')}`,
          });
        }

        for (const access of member.access) {
          const organization = await manager
            .getRepository(Organization)
            .findOne({ where: { slug: access.organization } });
          if (!organization) continue;

          const memberships = manager.getRepository(OrganizationUser);
          const exists = await memberships.exists({
            where: { organizationId: organization.id, userId: user.id },
          });
          if (exists) continue;

          await memberships.save({
            organizationId: organization.id,
            userId: user.id,
            role: access.role,
            isActive: true,
          });
        }
      });
    }
    this.logger.log(`Demo team ready (${DEMO_TEAM.length} accounts).`);
  }
}
