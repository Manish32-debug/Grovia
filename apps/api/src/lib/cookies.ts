import type { Response } from 'express';
import { env, isProd } from '../config/env.js';

export const REFRESH_COOKIE = 'grovia_rt';

/**
 * The web app and API are hosted on different production origins.
 *
 * Production therefore needs SameSite=None so the browser can send the
 * httpOnly refresh cookie from the Grovia web app to the API refresh endpoint.
 * SameSite=None requires Secure, which is already enabled in production.
 *
 * The refresh endpoint also requires the X-Requested-With header, which
 * prevents a normal cross-site HTML form from making the same authenticated
 * request.
 */
const basePath = '/api/v1/auth';

const sameSite = isProd ? 'none' : 'lax';

export function setRefreshCookie(
  res: Response,
  token: string,
  ttlDays: number,
): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: basePath,
    domain: env.COOKIE_DOMAIN,
    maxAge: ttlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd,
    sameSite,
    path: basePath,
    domain: env.COOKIE_DOMAIN,
  });
}