import type { ApiErrorResponse, FieldErrorResponse } from "@/shared/types/api.generated";

/**
 * Every failed request rejects with an ApiError (never a raw AxiosError), so
 * UI code can rely on `status`, `code`, `fieldErrors` and `requestId`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: FieldErrorResponse[];
  readonly details: Record<string, unknown> | undefined;
  readonly requestId: string | undefined;
  readonly isNetworkError: boolean;

  constructor(init: {
    message: string;
    status: number;
    code: string;
    fieldErrors?: FieldErrorResponse[];
    details?: Record<string, unknown>;
    requestId?: string;
    isNetworkError?: boolean;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? [];
    this.details = init.details;
    this.requestId = init.requestId;
    this.isNetworkError = init.isNetworkError ?? false;
  }

  /** First message for a given field, for inline form errors. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors.find((error) => error.field === field)?.message;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Builds an ApiError from the backend error envelope (or a network failure). */
export function toApiError(
  status: number | undefined,
  body: Partial<ApiErrorResponse> | undefined,
  fallbackMessage: string,
): ApiError {
  if (!status) {
    return new ApiError({
      message: "Can't reach the server. Check your connection and try again.",
      status: 0,
      code: "NETWORK_ERROR",
      isNetworkError: true,
    });
  }
  return new ApiError({
    message: body?.message || fallbackMessage || "Something went wrong.",
    status: body?.statusCode ?? status,
    code: body?.code ?? (status >= 500 ? "INTERNAL_ERROR" : "UNKNOWN"),
    fieldErrors: body?.errors,
    details: body?.details,
    requestId: body?.requestId,
  });
}

/** Human message for toasts; adds the request id on server errors for support. */
export function errorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (isApiError(error)) {
    if (error.status >= 500 && error.requestId) {
      return `${error.message} (ref ${error.requestId.slice(0, 8)})`;
    }
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
