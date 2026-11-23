import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Short shared caching for anonymous public reads
 *. Express adds a weak ETag, so
 * repeat requests within the window are cheap `304`s. Errors are never
 * cached because this only runs on the success path.
 */
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const response = http.getResponse<Response>();
    // A draft preview is personal and must never be shared or kept.
    const preview = http.getRequest<Request>().query?.preview !== undefined;
    return next.handle().pipe(
      tap(() => {
        response.setHeader(
          'Cache-Control',
          preview
            ? 'private, no-store'
            : 'public, max-age=30, stale-while-revalidate=60',
        );
      }),
    );
  }
}
