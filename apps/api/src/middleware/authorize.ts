import type { RequestHandler } from 'express';
import type { Role } from '@grovia/shared';
import { AppError } from '../lib/AppError.js';

/**
 * Coarse role gate. Ownership of a specific resource is always checked inside
 * the service against req.user.id — a role check alone would let one customer
 * read another customer's order.
 */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(AppError.unauthenticated());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
