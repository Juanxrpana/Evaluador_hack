import pino from 'pino';
import { env } from '../config/env.ts';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  'err.body',
  'password',
  'token',
  'authorization',
  'cookie',
];

const prettyTransport =
  env.NODE_ENV !== 'production' && env.LOG_PRETTY
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname,service,env',
        },
      }
    : undefined;

export const logger = pino({
  level: env.LOG_LEVEL,
  base: {
    service: 'api',
    env: env.NODE_ENV,
  },
  redact: {
    paths: redactPaths,
    censor: '[redacted]',
  },
  ...(prettyTransport ? { transport: prettyTransport } : {}),
});
