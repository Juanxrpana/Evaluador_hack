import { OpenAPIHandler } from '@orpc/openapi/node';
import { onError, ORPCError } from '@orpc/server';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.ts';
import type { UserRepository } from './modules/users/user.repository.ts';
import { createRouter } from './router/index.ts';

export interface AppDependencies {
  users: UserRepository;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const router = createRouter(dependencies);
  const openAPIHandler = new OpenAPIHandler(router, {
    interceptors: [
      onError((error) => {
        // 4xx errors are expected client mistakes, not server incidents.
        if (error instanceof ORPCError && error.status < 500) {
          return;
        }

        console.error('[api]', error);
      }),
    ],
  });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // oRPC reads the raw request body. Mount it before express.json() so
  // bracket notation and non-JSON payloads are not consumed by Express.
  app.use('/api{/*path}', async (req, res, next) => {
    const { matched } = await openAPIHandler.handle(req, res, {
      prefix: '/api',
      context: {},
    });

    if (matched) {
      return;
    }

    next();
  });

  app.use(express.json({ limit: '1mb' }));

  // Plain Express endpoint for infrastructure checks that should not depend
  // on the application contract.
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}
