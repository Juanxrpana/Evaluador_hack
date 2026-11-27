import type { ErrorRequestHandler, RequestHandler } from 'express';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    requestId: req.requestId,
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = statusFrom(error);

  if (status >= 500 && error instanceof Error) {
    // pino-http logs this on response finish, including the stack. Expected
    // 4xx errors stay in the access log without a stack trace.
    res.err = error;
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : messageFrom(error),
    requestId: req.requestId,
  });
};

function statusFrom(error: unknown): number {
  if (isHttpError(error)) {
    const status = error.status ?? error.statusCode;

    if (typeof status === 'number' && status >= 400 && status <= 599) {
      return status;
    }
  }

  return 500;
}

function messageFrom(error: unknown): string {
  if (isHttpError(error) && error.message) {
    return error.message;
  }

  return 'Request failed';
}

function isHttpError(error: unknown): error is HttpError {
  return error instanceof Error;
}
