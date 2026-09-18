import type { Response } from 'express';
import { env, isProd } from '../config/env.js';

export const REFRESH_COOKIE = 'grovia_rt';

/**
 * Scoped to the auth routes, so the refresh token is not attached to every
 * catalog request. SameSite=Lax blocks cross-site form posts; the auth routes
 * additionally require an X-Requested-With header, which a cross-origin form
 * cannot set. Together that covers CSRF without a token endpoint.
 */
const basePath = '/api/v1/auth';

export function setRefreshCookie(res: Response, token: string, ttlDays: number): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: basePath,
    domain: env.COOKIE_DOMAIN,
    maxAge: ttlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: basePath,
    domain: env.COOKIE_DOMAIN,
  });
}
