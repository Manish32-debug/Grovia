import rateLimitModule from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { ErrorCode } from '@grovia/shared';
import { isTest } from '../config/env.js';

type RateLimitFactory = (options: object) => RequestHandler;

const rateLimit =
  rateLimitModule as unknown as RateLimitFactory;

/**
 * In-memory store: correct for a single API instance. Running more than one
 * replica requires a shared store (Postgres or Upstash) — swap the `store`
 * option, nothing else changes.
 */
const rejection = (message: string) => ({
  error: {
    code: ErrorCode.RATE_LIMITED,
    message,
  },
});

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: isTest ? 100_000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rejection(
    'Too many requests. Slow down and retry shortly.',
  ),
});

/**
 * Credential stuffing is the threat here, so the window is per IP and tight.
 * Successful requests do not consume the login limit.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: isTest ? 100_000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rejection(
    'Too many sign-in attempts. Try again in a few minutes.',
  ),
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: isTest ? 100_000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rejection(
    'Too many accounts created from this network. Try again later.',
  ),
});

/**
 * Also throttles the outbound mail, not just the endpoint.
 */
export const emailActionLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: isTest ? 100_000 : 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rejection(
    'Too many requests. Check your inbox, then try again later.',
  ),
});

/**
 * Checkout is idempotency-keyed, but still shouldn't be hammered per user.
 *
 * Note: express-rate-limit's default key is the client IP. A true per-user
 * limiter should provide a user-aware `keyGenerator` after authentication.
 */
export const checkoutLimiter = rateLimit({
  windowMs: 60_000,
  limit: isTest ? 100_000 : 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rejection(
    'Too many checkout attempts. Wait a moment and try again.',
  ),
});

/**
 * Payment status polling from the frontend while a QR/session is open.
 */
export const paymentPollLimiter = rateLimit({
  windowMs: 60_000,
  limit: isTest ? 100_000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: rejection('Too many status checks. Slow down.'),
});