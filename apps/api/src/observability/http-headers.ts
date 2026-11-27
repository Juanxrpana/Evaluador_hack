import type { NextFunction, Request, Response } from 'express';

export const exposedHeaders = [
  'X-Request-Id',
  'X-Trace-Id',
  'RateLimit',
  'RateLimit-Policy',
  'Retry-After',
];

export function noStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
