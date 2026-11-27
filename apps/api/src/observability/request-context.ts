import { AsyncLocalStorage } from 'node:async_hooks';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { logger } from './logger.ts';
import { requestPath, truncate } from './metadata.ts';

export interface RequestLogContext {
  requestId: string;
  traceId: string;
  method: string;
  path: string;
  ip: string | null;
  userAgent: string | null;
  actorId: string | null;
  log: Logger;
}

const storage = new AsyncLocalStorage<RequestLogContext>();

export function requestContext(req: Request, _res: Response, next: NextFunction): void {
  storage.run(
    {
      requestId: req.requestId,
      traceId: req.traceId,
      method: req.method,
      path: requestPath(req.originalUrl),
      ip: req.ip ?? null,
      userAgent: truncate(req.get('user-agent'), 512),
      actorId: null,
      log: req.log,
    },
    next,
  );
}

export function getRequestContext(): RequestLogContext | undefined {
  return storage.getStore();
}

export function getRequestLogger(): Logger {
  return storage.getStore()?.log ?? logger;
}

/**
 * Authentication middleware can call this once it knows the actor. Audit
 * events emitted later in the request inherit the actor automatically.
 */
export function setRequestActor(actorId: string | null): void {
  const context = storage.getStore();

  if (context) {
    context.actorId = actorId;
  }
}
