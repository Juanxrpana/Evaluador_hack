import type { NextFunction, Request, Response } from 'express';
import { logger } from './logger.ts';
import { getRequestContext, type RequestLogContext } from './request-context.ts';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ABORTED_REQUEST_STATUS = 499;

export type AuditOutcome = 'success' | 'failure';

export interface AuditEvent {
  action: string;
  outcome?: AuditOutcome;
  resource?: string;
  resourceId?: string;
  status?: number;
  durationMs?: number;
  actorId?: string | null;
}

// Audit records are not sampled or suppressed by the access-log level.
const auditLogger = logger.child({ audit: true }, { level: 'info' });

/**
 * Logs every mutating API request. It is mounted before the rate limiters so
 * rejected writes are still recorded.
 */
export function auditMutations(req: Request, res: Response, next: NextFunction): void {
  if (!WRITE_METHODS.has(req.method)) {
    next();
    return;
  }

  const context = getRequestContext();
  const startedAt = process.hrtime.bigint();
  let recorded = false;

  const record = (aborted: boolean) => {
    if (recorded) {
      return;
    }

    recorded = true;

    const status = aborted ? ABORTED_REQUEST_STATUS : res.statusCode;

    recordAuditEvent(
      {
        action: 'http.request',
        outcome: !aborted && status < 400 ? 'success' : 'failure',
        status,
        durationMs: elapsedMilliseconds(startedAt),
      },
      context,
    );
  };

  res.once('finish', () => record(false));
  res.once('close', () => {
    if (!res.writableFinished) {
      record(true);
    }
  });

  next();
}

/**
 * Records a domain-level audit event. When called inside a request, request
 * metadata and the current actor are attached automatically.
 */
export function recordAuditEvent(
  event: AuditEvent,
  context: RequestLogContext | undefined = getRequestContext(),
): void {
  auditLogger.info(
    {
      action: event.action,
      outcome: event.outcome ?? 'success',
      resource: event.resource ?? null,
      resourceId: event.resourceId ?? null,
      status: event.status ?? null,
      durationMs: event.durationMs ?? null,
      actorId: event.actorId ?? context?.actorId ?? null,
      requestId: context?.requestId ?? null,
      traceId: context?.traceId ?? null,
      method: context?.method ?? null,
      path: context?.path ?? null,
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
    },
    'audit',
  );
}

function elapsedMilliseconds(startedAt: bigint): number {
  const nanoseconds = Number(process.hrtime.bigint() - startedAt);
  return Math.round(nanoseconds / 1e3) / 1e3;
}
