import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';

/**
 * CSRF defence for the cookie-authenticated auth routes. A cross-origin
 * <form> can POST but cannot set a custom header, and a cross-origin fetch that
 * sets one triggers a preflight our CORS allowlist rejects. Combined with
 * SameSite=Lax on the refresh cookie this is sufficient; no token endpoint,
 * nothing to synchronise.
 */
export const requireSameSiteRequest: RequestHandler = (req, _res, next) => {
  if (req.header('x-requested-with') !== 'grovia-web') {
    return next(AppError.forbidden('This request could not be verified. Reload and try again.'));
  }
  next();
};
