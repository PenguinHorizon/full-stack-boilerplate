// Barrel consumed by DatabaseModule (`Object.values(entities)`). Every entity
// must be exported here AND live under entities/** (data-source glob).

// Identity & access
export * from './identity/user.entity';
export * from './identity/refresh-token.entity';
export * from './identity/audit-log.entity';
export * from './identity/organization-user.entity';
export * from './identity/notification.entity';

// Tenancy
export * from './tenancy/organization.entity';
export * from './tenancy/organization-settings.entity';
export * from './tenancy/organization-domain.entity';

// Public website content
export * from './website/content.entity';
export * from './website/inquiry.entity';

// Customers (public-site accounts)
export * from './customers/customer.entity';

// Platform
export * from './platform/media-asset.entity';
export * from './platform/system-settings.entity';
