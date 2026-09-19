import express, { type Express, type RequestHandler } from 'express';
import cors from 'cors';
import helmetModule from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { requestId } from './middleware/requestId.js';
import { globalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';
import { webhook as paymentWebhook } from './controllers/payment.controller.js';

export const API_PREFIX = '/api/v1';

type HelmetFactory = (options?: {
  crossOriginResourcePolicy?: {
    policy?: string;
  };
}) => RequestHandler;

const helmet = helmetModule as unknown as HelmetFactory;

export function createApp(): Express {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: 'cross-origin',
      },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      exposedHeaders: ['x-request-id'],
    }),
  );

  const httpLogger = pinoHttp({
    logger,
  });

  app.use(httpLogger);

  // Cashfree webhook must be mounted before express.json().
  // HMAC verification requires the untouched raw request body.
  app.post(
    `${API_PREFIX}/payments/webhook`,
    express.raw({
      type: 'application/json',
      limit: '1mb',
    }),
    paymentWebhook,
  );

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

  app.use(cookieParser());

  app.use(globalLimiter);

  app.use(API_PREFIX, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();

export default app;