import { OpenAPIHandler } from '@orpc/openapi/node';
import { onError, ORPCError } from '@orpc/server';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.ts';
import type { UserService } from './modules/users/user.service.ts';
import { auditMutations } from './observability/audit.ts';
import { errorHandler, notFound } from './observability/error-handler.ts';
import { exposedHeaders, noStore } from './observability/http-headers.ts';
import { httpLogger } from './observability/http-logger.ts';
import { apiLimiter, writeLimiter } from './observability/rate-limit.ts';
import { getRequestLogger, requestContext } from './observability/request-context.ts';
import { requestId } from './observability/request-id.ts';
import { createRouter } from './router/index.ts';

export interface AppDependencies {
  users: UserService;
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

        getRequestLogger().error({ err: error }, 'unhandled oRPC error');
      }),
    ],
  });

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  // Correlation IDs must exist before anything writes a log line. The context
  // middleware then makes the request logger available to handlers.
  app.use(requestId);
  app.use(httpLogger);
  app.use(requestContext);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      exposedHeaders,
    }),
  );

  // Audit before rate limiting so rejected write attempts are recorded too.
  app.use('/api', noStore, auditMutations, apiLimiter, writeLimiter);

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

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
