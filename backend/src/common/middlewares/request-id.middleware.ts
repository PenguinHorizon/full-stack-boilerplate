import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Accept a caller's id only if it is short and harmless to log. */
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

type RequestWithId = Request & { requestId?: string };

export function requestIdOf(request: Request): string | undefined {
  return (request as RequestWithId).requestId;
}

/**
 * Reuses an upstream `X-Request-Id` (e.g. from nginx) or creates one, exposes
 * it on the response, and makes it available to logs and error bodies so a
 * user-reported error can be found in the server logs.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.get(REQUEST_ID_HEADER);
    const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
    (req as RequestWithId).requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
