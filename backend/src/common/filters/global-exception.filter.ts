import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { codeForStatus, ErrorCode } from '@common/errors/error-codes';
import { FieldError } from '@common/errors/domain.exception';
import { requestIdOf } from '@common/middlewares/request-id.middleware';

export interface ErrorResponseBody {
  success: false;
  statusCode: number;
  code: string;
  message: string;
  errors?: FieldError[];
  details?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
  path: string;
  stack?: string;
}

interface Extracted {
  code: string;
  message: string;
  errors?: FieldError[];
  details?: Record<string, unknown>;
}

/**
 * Single global error shape.
 *
 * Deliberately never serialises the exception object itself: for a TypeORM
 * `QueryFailedError` that would include the failing SQL and its bound
 * parameters (password hashes among them).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message, errors, details } = this.extract(exception, statusCode);
    const requestId = requestIdOf(request);

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      code,
      message,
      ...(errors?.length ? { errors } : {}),
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const line = `${request.method} ${request.url} -> ${statusCode} ${code}: ${message}${
      requestId ? ` [${requestId}]` : ''
    }`;
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(line, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(line);
    }

    // Stack traces are a debugging aid, never part of the contract.
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      body.stack = exception.stack;
    }

    response.status(statusCode).json(body);
  }

  private extract(exception: unknown, statusCode: number): Extracted {
    if (exception instanceof ThrottlerException) {
      return {
        code: ErrorCode.RateLimited,
        message: 'Too many requests. Please wait a moment and try again.',
      };
    }

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const fallbackCode = codeForStatus(statusCode);

      if (typeof payload === 'string') {
        return { code: fallbackCode, message: payload };
      }

      if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const code = typeof record.code === 'string' ? record.code : fallbackCode;
        const details =
          record.details && typeof record.details === 'object'
            ? (record.details as Record<string, unknown>)
            : undefined;

        // Our own shape: { code, message, errors: FieldError[] }.
        if (Array.isArray(record.errors)) {
          const errors = (record.errors as unknown[]).map(toFieldError);
          return {
            code,
            message:
              typeof record.message === 'string' ? record.message : errors[0]?.message,
            errors,
            details,
          };
        }

        // Nest's built-in shape for pipes: { message: string[] }.
        if (Array.isArray(record.message)) {
          const errors = record.message.map(toFieldError);
          return {
            code: statusCode === 400 ? ErrorCode.ValidationFailed : code,
            message: errors[0]?.message ?? exception.message,
            errors,
            details,
          };
        }

        if (typeof record.message === 'string') {
          return { code, message: record.message, details };
        }
      }

      return { code: fallbackCode, message: exception.message };
    }

    // Never leak internals of an unexpected failure.
    return { code: ErrorCode.InternalError, message: 'Internal server error' };
  }
}

function toFieldError(value: unknown): FieldError {
  if (value && typeof value === 'object' && 'message' in value) {
    const item = value as { field?: unknown; message: unknown };
    return {
      field: typeof item.field === 'string' ? item.field : '',
      message: String(item.message),
    };
  }
  return { field: '', message: String(value) };
}
