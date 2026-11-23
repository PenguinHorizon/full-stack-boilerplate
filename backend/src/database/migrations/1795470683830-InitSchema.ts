import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1795470683830 implements MigrationInterface {
  name = 'InitSchema1795470683830';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`refresh_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_id\` int NOT NULL, \`token_hash\` char(64) NOT NULL, \`family_id\` char(36) NOT NULL, \`expires_at\` timestamp NOT NULL, \`revoked_at\` timestamp NULL, \`replaced_by\` char(64) NULL, \`user_agent\` varchar(255) NULL, \`ip\` varchar(45) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_refresh_tokens_user_id\` (\`user_id\`), UNIQUE INDEX \`IDX_refresh_tokens_token_hash\` (\`token_hash\`), INDEX \`IDX_refresh_tokens_family_id\` (\`family_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`user_code\` varchar(20) NULL, \`name\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`phone\` varchar(20) NULL, \`password\` varchar(255) NOT NULL, \`is_super_admin\` tinyint NOT NULL DEFAULT 0, \`is_active\` tinyint NOT NULL DEFAULT 1, \`avatar\` varchar(500) NULL, \`reset_password_token\` varchar(64) NULL, \`reset_password_expires\` timestamp NULL, \`last_login_at\` datetime(6) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` timestamp(6) NULL, UNIQUE INDEX \`IDX_users_user_code\` (\`user_code\`), UNIQUE INDEX \`IDX_users_email\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`media_assets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NULL, \`provider\` enum ('local', 'cloudinary') NOT NULL, \`storage_key\` varchar(255) NOT NULL, \`url\` varchar(500) NOT NULL, \`mime_type\` varchar(100) NOT NULL, \`size_bytes\` int UNSIGNED NOT NULL, \`width\` smallint UNSIGNED NULL, \`height\` smallint UNSIGNED NULL, \`alt_text\` varchar(255) NULL, \`original_name\` varchar(255) NULL, \`uploaded_by_user_id\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_media_assets_organization_created\` (\`organization_id\`, \`created_at\`), UNIQUE INDEX \`UQ_media_assets_provider_key\` (\`provider\`, \`storage_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`organizations\` (\`id\` int NOT NULL AUTO_INCREMENT, \`slug\` varchar(60) NOT NULL, \`name\` varchar(120) NOT NULL, \`status\` enum ('draft', 'active', 'suspended', 'archived') NOT NULL DEFAULT 'draft', \`tagline\` varchar(160) NULL, \`short_description\` varchar(300) NULL, \`description\` text NULL, \`logo_media_id\` int NULL, \`cover_media_id\` int NULL, \`favicon_media_id\` int NULL, \`brand_primary_color\` char(7) NOT NULL DEFAULT '#C8553D', \`brand_accent_color\` char(7) NULL, \`contact_phone\` varchar(20) NULL, \`contact_email\` varchar(255) NULL, \`website_url\` varchar(255) NULL, \`whatsapp_number\` varchar(20) NULL, \`address_line\` varchar(255) NULL, \`city\` varchar(100) NULL, \`country_code\` char(2) NOT NULL DEFAULT 'PK', \`social_links\` json NULL, \`timezone\` varchar(64) NOT NULL DEFAULT 'Asia/Karachi', \`currency_code\` char(3) NOT NULL DEFAULT 'PKR', \`locale\` varchar(10) NOT NULL DEFAULT 'en-PK', \`created_by_user_id\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_organizations_status\` (\`status\`), UNIQUE INDEX \`UQ_organizations_slug\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`inquiries\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`name\` varchar(120) NOT NULL, \`phone\` varchar(20) NULL, \`email\` varchar(255) NULL, \`subject\` varchar(160) NULL, \`message\` text NOT NULL, \`status\` enum ('new', 'read', 'archived') NOT NULL DEFAULT 'new', \`ip_address\` varchar(45) NULL, \`user_agent\` varchar(255) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_inquiries_inbox\` (\`organization_id\`, \`status\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`website_sections\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`section_key\` enum ('hero', 'intro', 'gallery', 'testimonials', 'faqs', 'contact') NOT NULL, \`is_enabled\` tinyint NOT NULL DEFAULT 1, \`sort_order\` int NOT NULL DEFAULT '0', \`title\` varchar(160) NULL, \`subtitle\` varchar(300) NULL, \`settings\` json NULL, \`updated_by_user_id\` int NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_website_sections_organization_key\` (\`organization_id\`, \`section_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`banners\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`placement\` enum ('hero', 'home') NOT NULL, \`internal_name\` varchar(120) NOT NULL, \`headline\` varchar(160) NULL, \`subheadline\` varchar(300) NULL, \`cta_label\` varchar(40) NULL, \`cta_url\` varchar(500) NULL, \`desktop_media_id\` int NOT NULL, \`mobile_media_id\` int NULL, \`starts_at\` datetime(6) NULL, \`ends_at\` datetime(6) NULL, \`status\` enum ('draft', 'published') NOT NULL DEFAULT 'draft', \`sort_order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_banners_public\` (\`organization_id\`, \`placement\`, \`status\`, \`sort_order\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`gallery_images\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`media_id\` int NOT NULL, \`caption\` varchar(255) NULL, \`tag\` varchar(40) NULL, \`status\` enum ('draft', 'published') NOT NULL DEFAULT 'published', \`sort_order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_gallery_images_public\` (\`organization_id\`, \`status\`, \`sort_order\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`testimonials\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`author_name\` varchar(120) NOT NULL, \`author_detail\` varchar(120) NULL, \`quote\` text NOT NULL, \`rating\` tinyint UNSIGNED NULL, \`source\` varchar(40) NULL, \`avatar_media_id\` int NULL, \`status\` enum ('draft', 'published') NOT NULL DEFAULT 'draft', \`sort_order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_testimonials_public\` (\`organization_id\`, \`status\`, \`sort_order\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`faqs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`category\` varchar(60) NOT NULL DEFAULT 'General', \`question\` varchar(255) NOT NULL, \`answer\` text NOT NULL, \`status\` enum ('draft', 'published') NOT NULL DEFAULT 'draft', \`sort_order\` int NOT NULL DEFAULT '0', \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_faqs_public\` (\`organization_id\`, \`status\`, \`category\`, \`sort_order\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`pages\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`page_key\` enum ('about', 'privacy', 'terms') NOT NULL, \`title\` varchar(160) NOT NULL, \`body\` mediumtext NOT NULL, \`hero_media_id\` int NULL, \`status\` enum ('draft', 'published') NOT NULL DEFAULT 'draft', \`published_at\` datetime(6) NULL, \`updated_by_user_id\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_pages_organization_key\` (\`organization_id\`, \`page_key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`organization_settings\` (\`organization_id\` int NOT NULL, \`website_enabled\` tinyint NOT NULL DEFAULT 1, \`customer_emails_enabled\` tinyint NOT NULL DEFAULT 1, \`seo_title\` varchar(70) NULL, \`seo_description\` varchar(160) NULL, \`analytics_measurement_id\` varchar(40) NULL, \`footer_text\` varchar(500) NULL, \`updated_by_user_id\` int NULL, \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (\`organization_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`organization_domains\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`hostname\` varchar(253) NOT NULL, \`is_primary\` tinyint NOT NULL DEFAULT 0, \`verified_at\` datetime(6) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_organization_domains_organization\` (\`organization_id\`), UNIQUE INDEX \`UQ_organization_domains_hostname\` (\`hostname\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`system_settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(100) NOT NULL, \`value\` text NOT NULL, \`group\` varchar(50) NOT NULL DEFAULT 'general', \`description\` varchar(255) NULL, \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`UQ_system_settings_key\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`organization_users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`user_id\` int NOT NULL, \`role\` enum ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER') NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`invited_by_user_id\` int NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_organization_users_user\` (\`user_id\`), UNIQUE INDEX \`UQ_organization_users_organization_user\` (\`organization_id\`, \`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`notifications\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`user_id\` int NOT NULL, \`type\` varchar(50) NOT NULL, \`title\` varchar(160) NOT NULL, \`body\` varchar(500) NULL, \`data\` json NULL, \`read_at\` datetime(6) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_notifications_organization_created\` (\`organization_id\`, \`created_at\`), INDEX \`IDX_notifications_inbox\` (\`user_id\`, \`organization_id\`, \`read_at\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`audit_logs\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NULL, \`user_id\` int NULL, \`user_name\` varchar(255) NULL, \`action\` varchar(100) NOT NULL, \`module\` varchar(100) NOT NULL, \`entity_type\` varchar(50) NULL, \`entity_id\` varchar(64) NULL, \`description\` text NULL, \`metadata\` json NULL, \`ip_address\` varchar(45) NULL, \`user_agent\` varchar(255) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_audit_logs_user_id\` (\`user_id\`), INDEX \`IDX_audit_logs_created_at\` (\`created_at\`), INDEX \`IDX_audit_logs_entity\` (\`entity_type\`, \`entity_id\`), INDEX \`IDX_audit_logs_organization_created\` (\`organization_id\`, \`created_at\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`customers\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`name\` varchar(120) NOT NULL, \`phone\` varchar(20) NOT NULL, \`email\` varchar(255) NULL, \`password\` varchar(255) NULL, \`registered_at\` datetime(6) NULL, \`phone_verified_at\` datetime(6) NULL, \`email_verified_at\` datetime(6) NULL, \`status\` enum ('active', 'blocked') NOT NULL DEFAULT 'active', \`blocked_reason\` varchar(255) NULL, \`reset_password_token\` char(64) NULL, \`reset_password_expires\` datetime(6) NULL, \`last_login_at\` datetime(6) NULL, \`admin_notes\` text NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, INDEX \`IDX_customers_reset_token\` (\`reset_password_token\`), UNIQUE INDEX \`UQ_customers_organization_email\` (\`organization_id\`, \`email\`), UNIQUE INDEX \`UQ_customers_organization_phone\` (\`organization_id\`, \`phone\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`customer_refresh_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`organization_id\` int NOT NULL, \`customer_id\` int NOT NULL, \`token_hash\` char(64) NOT NULL, \`family_id\` char(36) NOT NULL, \`expires_at\` datetime(6) NOT NULL, \`revoked_at\` datetime(6) NULL, \`replaced_by\` char(64) NULL, \`user_agent\` varchar(255) NULL, \`ip\` varchar(45) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_customer_refresh_tokens_family\` (\`family_id\`), INDEX \`IDX_customer_refresh_tokens_customer\` (\`customer_id\`), UNIQUE INDEX \`UQ_customer_refresh_tokens_hash\` (\`token_hash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_refresh_tokens_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`media_assets\` ADD CONSTRAINT \`FK_media_assets_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`media_assets\` ADD CONSTRAINT \`FK_media_assets_uploaded_by\` FOREIGN KEY (\`uploaded_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD CONSTRAINT \`FK_organizations_logo\` FOREIGN KEY (\`logo_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD CONSTRAINT \`FK_organizations_cover\` FOREIGN KEY (\`cover_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD CONSTRAINT \`FK_organizations_favicon\` FOREIGN KEY (\`favicon_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` ADD CONSTRAINT \`FK_organizations_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`inquiries\` ADD CONSTRAINT \`FK_inquiries_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`website_sections\` ADD CONSTRAINT \`FK_website_sections_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`website_sections\` ADD CONSTRAINT \`FK_website_sections_updated_by\` FOREIGN KEY (\`updated_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`banners\` ADD CONSTRAINT \`FK_banners_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`banners\` ADD CONSTRAINT \`FK_banners_desktop_media\` FOREIGN KEY (\`desktop_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`banners\` ADD CONSTRAINT \`FK_banners_mobile_media\` FOREIGN KEY (\`mobile_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gallery_images\` ADD CONSTRAINT \`FK_gallery_images_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`gallery_images\` ADD CONSTRAINT \`FK_gallery_images_media\` FOREIGN KEY (\`media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`testimonials\` ADD CONSTRAINT \`FK_testimonials_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`testimonials\` ADD CONSTRAINT \`FK_testimonials_avatar\` FOREIGN KEY (\`avatar_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`faqs\` ADD CONSTRAINT \`FK_faqs_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_hero_media\` FOREIGN KEY (\`hero_media_id\`) REFERENCES \`media_assets\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`pages\` ADD CONSTRAINT \`FK_pages_updated_by\` FOREIGN KEY (\`updated_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_settings\` ADD CONSTRAINT \`FK_organization_settings_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_settings\` ADD CONSTRAINT \`FK_organization_settings_updated_by\` FOREIGN KEY (\`updated_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_domains\` ADD CONSTRAINT \`FK_organization_domains_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_users\` ADD CONSTRAINT \`FK_organization_users_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_users\` ADD CONSTRAINT \`FK_organization_users_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_users\` ADD CONSTRAINT \`FK_organization_users_invited_by\` FOREIGN KEY (\`invited_by_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_notifications_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_notifications_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` ADD CONSTRAINT \`FK_audit_logs_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`customers\` ADD CONSTRAINT \`FK_customers_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`customer_refresh_tokens\` ADD CONSTRAINT \`FK_customer_refresh_tokens_organization\` FOREIGN KEY (\`organization_id\`) REFERENCES \`organizations\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`customer_refresh_tokens\` ADD CONSTRAINT \`FK_customer_refresh_tokens_customer\` FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`customer_refresh_tokens\` DROP FOREIGN KEY \`FK_customer_refresh_tokens_customer\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`customer_refresh_tokens\` DROP FOREIGN KEY \`FK_customer_refresh_tokens_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`customers\` DROP FOREIGN KEY \`FK_customers_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`audit_logs\` DROP FOREIGN KEY \`FK_audit_logs_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_notifications_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_notifications_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_users\` DROP FOREIGN KEY \`FK_organization_users_invited_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_users\` DROP FOREIGN KEY \`FK_organization_users_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_users\` DROP FOREIGN KEY \`FK_organization_users_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_domains\` DROP FOREIGN KEY \`FK_organization_domains_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_settings\` DROP FOREIGN KEY \`FK_organization_settings_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organization_settings\` DROP FOREIGN KEY \`FK_organization_settings_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_hero_media\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`pages\` DROP FOREIGN KEY \`FK_pages_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`faqs\` DROP FOREIGN KEY \`FK_faqs_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`testimonials\` DROP FOREIGN KEY \`FK_testimonials_avatar\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`testimonials\` DROP FOREIGN KEY \`FK_testimonials_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`gallery_images\` DROP FOREIGN KEY \`FK_gallery_images_media\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`gallery_images\` DROP FOREIGN KEY \`FK_gallery_images_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`banners\` DROP FOREIGN KEY \`FK_banners_mobile_media\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`banners\` DROP FOREIGN KEY \`FK_banners_desktop_media\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`banners\` DROP FOREIGN KEY \`FK_banners_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`website_sections\` DROP FOREIGN KEY \`FK_website_sections_updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`website_sections\` DROP FOREIGN KEY \`FK_website_sections_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`inquiries\` DROP FOREIGN KEY \`FK_inquiries_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP FOREIGN KEY \`FK_organizations_created_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP FOREIGN KEY \`FK_organizations_favicon\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP FOREIGN KEY \`FK_organizations_cover\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`organizations\` DROP FOREIGN KEY \`FK_organizations_logo\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`media_assets\` DROP FOREIGN KEY \`FK_media_assets_uploaded_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`media_assets\` DROP FOREIGN KEY \`FK_media_assets_organization\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_refresh_tokens_user\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_customer_refresh_tokens_hash\` ON \`customer_refresh_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_customer_refresh_tokens_customer\` ON \`customer_refresh_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_customer_refresh_tokens_family\` ON \`customer_refresh_tokens\``,
    );
    await queryRunner.query(`DROP TABLE \`customer_refresh_tokens\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_customers_organization_phone\` ON \`customers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_customers_organization_email\` ON \`customers\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_customers_reset_token\` ON \`customers\``,
    );
    await queryRunner.query(`DROP TABLE \`customers\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_audit_logs_organization_created\` ON \`audit_logs\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_audit_logs_entity\` ON \`audit_logs\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_audit_logs_created_at\` ON \`audit_logs\``,
    );
    await queryRunner.query(`DROP INDEX \`IDX_audit_logs_user_id\` ON \`audit_logs\``);
    await queryRunner.query(`DROP TABLE \`audit_logs\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_notifications_inbox\` ON \`notifications\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_notifications_organization_created\` ON \`notifications\``,
    );
    await queryRunner.query(`DROP TABLE \`notifications\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_organization_users_organization_user\` ON \`organization_users\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_organization_users_user\` ON \`organization_users\``,
    );
    await queryRunner.query(`DROP TABLE \`organization_users\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_system_settings_key\` ON \`system_settings\``,
    );
    await queryRunner.query(`DROP TABLE \`system_settings\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_organization_domains_hostname\` ON \`organization_domains\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_organization_domains_organization\` ON \`organization_domains\``,
    );
    await queryRunner.query(`DROP TABLE \`organization_domains\``);
    await queryRunner.query(`DROP TABLE \`organization_settings\``);
    await queryRunner.query(`DROP INDEX \`UQ_pages_organization_key\` ON \`pages\``);
    await queryRunner.query(`DROP TABLE \`pages\``);
    await queryRunner.query(`DROP INDEX \`IDX_faqs_public\` ON \`faqs\``);
    await queryRunner.query(`DROP TABLE \`faqs\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_testimonials_public\` ON \`testimonials\``,
    );
    await queryRunner.query(`DROP TABLE \`testimonials\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_gallery_images_public\` ON \`gallery_images\``,
    );
    await queryRunner.query(`DROP TABLE \`gallery_images\``);
    await queryRunner.query(`DROP INDEX \`IDX_banners_public\` ON \`banners\``);
    await queryRunner.query(`DROP TABLE \`banners\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_website_sections_organization_key\` ON \`website_sections\``,
    );
    await queryRunner.query(`DROP TABLE \`website_sections\``);
    await queryRunner.query(`DROP INDEX \`IDX_inquiries_inbox\` ON \`inquiries\``);
    await queryRunner.query(`DROP TABLE \`inquiries\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_organizations_slug\` ON \`organizations\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_organizations_status\` ON \`organizations\``,
    );
    await queryRunner.query(`DROP TABLE \`organizations\``);
    await queryRunner.query(
      `DROP INDEX \`UQ_media_assets_provider_key\` ON \`media_assets\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_media_assets_organization_created\` ON \`media_assets\``,
    );
    await queryRunner.query(`DROP TABLE \`media_assets\``);
    await queryRunner.query(`DROP INDEX \`IDX_users_email\` ON \`users\``);
    await queryRunner.query(`DROP INDEX \`IDX_users_user_code\` ON \`users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_refresh_tokens_family_id\` ON \`refresh_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_refresh_tokens_token_hash\` ON \`refresh_tokens\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_refresh_tokens_user_id\` ON \`refresh_tokens\``,
    );
    await queryRunner.query(`DROP TABLE \`refresh_tokens\``);
  }
}
