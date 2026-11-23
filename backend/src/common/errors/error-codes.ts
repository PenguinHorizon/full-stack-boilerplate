/**
 * Machine-readable error codes returned in every error body (`code`).
 * Add codes here as features introduce them; never repurpose one.
 */
export enum ErrorCode {
  // Generic
  ValidationFailed = 'VALIDATION_FAILED',
  BadRequest = 'BAD_REQUEST',
  Unauthenticated = 'UNAUTHENTICATED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Conflict = 'CONFLICT',
  PayloadTooLarge = 'PAYLOAD_TOO_LARGE',
  RateLimited = 'RATE_LIMITED',
  InternalError = 'INTERNAL_ERROR',

  // Tenancy / storefront
  OrganizationUnavailable = 'ORGANIZATION_UNAVAILABLE',
  SlugTaken = 'SLUG_TAKEN',
  InvalidReference = 'INVALID_REFERENCE',

  // Access & team
  EmailTaken = 'EMAIL_TAKEN',
  PasswordRequired = 'PASSWORD_REQUIRED',
  AlreadyMember = 'ALREADY_MEMBER',
  RoleNotAssignable = 'ROLE_NOT_ASSIGNABLE',
  LastOwner = 'LAST_OWNER',
  LastSuperAdmin = 'LAST_SUPER_ADMIN',

  // Media
  MediaInUse = 'MEDIA_IN_USE',
  UnsupportedMedia = 'UNSUPPORTED_MEDIA',

  // Customers
  CustomerBlocked = 'CUSTOMER_BLOCKED',
  PhoneTaken = 'PHONE_TAKEN',
}

/** Default code for an HTTP status when the thrower did not provide one. */
export function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BadRequest;
    case 401:
      return ErrorCode.Unauthenticated;
    case 403:
      return ErrorCode.Forbidden;
    case 404:
      return ErrorCode.NotFound;
    case 409:
      return ErrorCode.Conflict;
    case 413:
      return ErrorCode.PayloadTooLarge;
    case 429:
      return ErrorCode.RateLimited;
    default:
      return status >= 500 ? ErrorCode.InternalError : ErrorCode.BadRequest;
  }
}
