import type { RequestHandler } from 'express';
import { ErrorCode, type Role } from '@grovia/shared';
import { AppError } from '../lib/AppError.js';
import { prisma } from '../config/prisma.js';
import { verifyAccessToken } from '../services/auth/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: Role; tokenVersion: number };
    }
  }
}

/**
 * Verifies the bearer token and checks it against the user's current
 * tokenVersion. That single extra read is what makes password resets able to
 * kill live access tokens without maintaining a revocation list.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.header('authorization');

    if (!header?.startsWith('Bearer ')) {
      throw AppError.unauthenticated();
    }

    const result = await verifyAccessToken(header.slice(7).trim());

    if (!result.ok) {
      const reason = 'reason' in result ? result.reason : undefined;

      throw reason === 'expired'
        ? new AppError(
            401,
            ErrorCode.TOKEN_EXPIRED,
            'Your session expired. Refreshing…',
          )
        : AppError.unauthenticated();
    }

    const user = await prisma.user.findUnique({
      where: { id: result.claims.sub },
      select: {
        id: true,
        role: true,
        tokenVersion: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw AppError.unauthenticated();
    }

    if (user.tokenVersion !== result.claims.tv) {
      throw new AppError(
        401,
        ErrorCode.SESSION_REVOKED,
        'Your password changed. Sign in again.',
      );
    }

    req.user = {
      id: user.id,
      role: user.role as Role,
      tokenVersion: user.tokenVersion,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/** Populates req.user when a valid token is present, but never rejects. */
export const optionalAuthenticate: RequestHandler = (req, res, next) => {
  if (!req.header('authorization')) {
    return next();
  }

  authenticate(req, res, (err) =>
    next(err instanceof AppError ? undefined : err),
  );
};