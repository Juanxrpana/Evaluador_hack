import { OpenAPIHandler } from '@orpc/openapi/node';
import { onError, ORPCError } from '@orpc/server';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import type { Auth } from './auth/auth.ts';
import { env } from './config/env.ts';
import type { ChatService } from './modules/chat/chat.service.ts';
import type { DocumentoService } from './modules/documentos/documento.service.ts';
import type { PropuestaService } from './modules/propuestas/propuesta.service.ts';
import type { ProyectoService } from './modules/proyectos/proyecto.service.ts';
import type { ProveedorService } from './modules/proveedores/proveedor.service.ts';
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
  auth: Auth;
  users: UserService;
  proyectos: ProyectoService;
  proveedores: ProveedorService;
  propuestas: PropuestaService;
  documentos: DocumentoService;
  chat: ChatService;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const router = createRouter(dependencies);
  const authHandler = toNodeHandler(dependencies.auth);
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
  // Better Auth needs the raw body, so it is mounted before the oRPC handler
  // and before express.json(). Its own auth-aware rate limiter replaces the
  // generic write limiter for these routes.
  app.use('/api', noStore, auditMutations);

  app.all('/api/auth/{*any}', (req, res) => {
    // Never trust a client-supplied rate-limit key. Express `req.ip` already
    // honors TRUST_PROXY, so both stacks agree on the caller's address.
    req.headers['x-client-ip'] = req.ip ?? '';
    return authHandler(req, res);
  });

  app.use('/api', apiLimiter, writeLimiter);

  // oRPC reads the raw request body. Mount it before express.json() so
  // bracket notation and non-JSON payloads are not consumed by Express.
  app.use('/api{/*path}', async (req, res, next) => {
    const session = await dependencies.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    const { matched } = await openAPIHandler.handle(req, res, {
      prefix: '/api',
      context: { session },
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
