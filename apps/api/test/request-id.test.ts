import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { requestId } from '../src/observability/request-id.ts';

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
const SPAN_ID = '00f067aa0ba902b7';

describe('requestId', () => {
  it('generates request and trace IDs when none are supplied', () => {
    const { req, res, headers } = createRequest();
    const next = vi.fn();

    requestId(req, res, next as unknown as NextFunction);

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(req.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(headers.get('X-Request-Id')).toBe(req.requestId);
    expect(headers.get('X-Trace-Id')).toBe(req.traceId);
    expect(next).toHaveBeenCalledOnce();
  });

  it('accepts valid inbound correlation headers', () => {
    const { req, res, headers } = createRequest({
      'x-request-id': 'client-123',
      traceparent: `00-${TRACE_ID}-${SPAN_ID}-01`,
    });

    requestId(req, res, vi.fn() as unknown as NextFunction);

    expect(req.requestId).toBe('client-123');
    expect(req.traceId).toBe(TRACE_ID);
    expect(headers.get('X-Request-Id')).toBe('client-123');
    expect(headers.get('X-Trace-Id')).toBe(TRACE_ID);
  });

  it('rejects unsafe request IDs and invalid trace contexts', () => {
    const { req, res } = createRequest({
      'x-request-id': 'bad\nvalue',
      traceparent: `00-${'0'.repeat(32)}-${SPAN_ID}-01`,
    });

    requestId(req, res, vi.fn() as unknown as NextFunction);

    expect(req.requestId).not.toBe('bad\nvalue');
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(req.traceId).not.toBe('0'.repeat(32));
    expect(req.traceId).toMatch(/^[0-9a-f]{32}$/);
  });
});

function createRequest(headers: Record<string, string> = {}): {
  req: Request;
  res: Response;
  headers: Map<string, string>;
} {
  const responseHeaders = new Map<string, string>();
  const req = {
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as Request;
  const res = {
    setHeader(name: string, value: string) {
      responseHeaders.set(name, value);
    },
  } as unknown as Response;

  return { req, res, headers: responseHeaders };
}
