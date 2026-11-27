import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request } from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { logger } from './logger.ts';
import { requestPath, truncate } from './metadata.ts';

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => (req as Request).requestId,
  wrapSerializers: false,
  autoLogging: {
    ignore: (req) => isHealthCheck(req) || isCorsPreflight(req),
  },
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) {
      return 'error';
    }

    if (res.statusCode === 429) {
      return 'warn';
    }

    return 'info';
  },
  customProps: (req) => {
    const expressRequest = req as Request;

    return {
      requestId: expressRequest.requestId,
      traceId: expressRequest.traceId,
    };
  },
  serializers: {
    req: serializeRequest,
    res: serializeResponse,
    err: serializeError,
  },
});

function serializeRequest(req: IncomingMessage) {
  const expressRequest = req as Request;

  return {
    method: req.method,
    path: requestPath(expressRequest.originalUrl ?? req.url),
    ip: expressRequest.ip ?? null,
    remoteAddress: req.socket?.remoteAddress ?? null,
    userAgent: truncate(req.headers['user-agent'], 512),
    contentLength: req.headers['content-length'] ?? null,
  };
}

function serializeResponse(res: ServerResponse) {
  return {
    statusCode: res.statusCode,
  };
}

function serializeError(error: Error) {
  // pino-http fabricates this error for 5xx responses that it did not receive
  // through an error handler. The original error is logged by onError or the
  // Express error handler; do not log pino-http's own stack as if it were real.
  if (error.message.startsWith('failed with status code ')) {
    return {
      type: error.name,
      message: error.message,
    };
  }

  return pino.stdSerializers.err(error);
}

function isHealthCheck(req: IncomingMessage): boolean {
  return requestPath(req.url) === '/healthz';
}

function isCorsPreflight(req: IncomingMessage): boolean {
  return req.method === 'OPTIONS' && req.headers['access-control-request-method'] !== undefined;
}
