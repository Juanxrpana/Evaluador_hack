import type { NextFunction, Request, Response } from 'express';
import { rateLimit, type Options } from 'express-rate-limit';
import { env } from '../config/env.ts';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function rateLimitExceeded(
  req: Request,
  res: Response,
  _next: NextFunction,
  options: Options,
): void {
  res.status(options.statusCode).json({
    error: 'Too Many Requests',
    requestId: req.requestId,
  });
}

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'api',
  handler: rateLimitExceeded,
});

export const writeLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_WRITE_MAX,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  identifier: 'write',
  skip: (req) => !WRITE_METHODS.has(req.method),
  handler: rateLimitExceeded,
});
