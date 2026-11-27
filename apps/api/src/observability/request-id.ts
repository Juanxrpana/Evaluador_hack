import { randomBytes, randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      traceId: string;
    }
  }
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const TRACEPARENT_PATTERN = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ZERO_TRACE_ID = '0'.repeat(32);
const ZERO_SPAN_ID = '0'.repeat(16);

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incomingRequestId = req.get('x-request-id');
  req.requestId =
    incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

  req.traceId = traceIdFrom(req.get('traceparent'));

  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('X-Trace-Id', req.traceId);

  next();
}

function traceIdFrom(traceparent: string | undefined): string {
  const match = traceparent?.match(TRACEPARENT_PATTERN);

  if (match) {
    const [, version, traceId, spanId] = match;

    if (version !== 'ff' && traceId !== ZERO_TRACE_ID && spanId !== ZERO_SPAN_ID) {
      return traceId;
    }
  }

  return randomBytes(16).toString('hex');
}
