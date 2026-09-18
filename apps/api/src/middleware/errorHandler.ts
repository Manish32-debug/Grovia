import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErrorCode, type ApiFailure } from '@grovia/shared';
import { AppError } from '../lib/AppError.js';
import { logger } from '../config/logger.js';
import { isProd } from '../config/env.js';

// pino-http types req.id as `string | number`; the envelope always carries a string.
const reqId = (id: unknown): string => String(id ?? '');

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`No route for ${req.method} ${req.originalUrl}`));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let body: ApiFailure['error'] = {
    code: ErrorCode.INTERNAL,
    message: 'Something went wrong on our side. Try again.',
    requestId: reqId(req.id),
  };

  if (err instanceof AppError) {
    status = err.status;
    body = { code: err.code, message: err.message, details: err.details, requestId: reqId(req.id) };
  } else if (err instanceof ZodError) {
    status = 422;
    body = {
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Check the highlighted fields and try again.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      requestId: reqId(req.id),
    };
  }

  // 5xx is our fault and always gets a stack; 4xx is expected traffic.
  if (status >= 500) logger.error({ err, reqId: reqId(req.id) }, 'unhandled error');
  else logger.debug({ code: body.code, reqId: reqId(req.id) }, 'request rejected');

  if (!isProd && status >= 500 && err instanceof Error) {
    body.details = { stack: err.stack };
  }

  res.status(status).json({ error: body } satisfies ApiFailure);
};
