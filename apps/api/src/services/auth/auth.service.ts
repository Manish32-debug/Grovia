import type { Prisma, User } from '@prisma/client';
import {
  ErrorCode,
  type AuthSession,
  type LoginInput,
  type PublicUser,
  type RegisterInput,
  type Role,
} from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import { createOpaqueToken, hashToken } from '../../lib/crypto.js';
import { burnTimingBudget, hashPassword, verifyPassword } from '../../lib/password.js';
import { mailer } from '../email/mailer.js';
import { signAccessToken } from './jwt.js';
import { classifyRefreshToken } from './refreshPolicy.js';

const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export interface SessionContext {
  userAgent?: string | undefined;
  ip?: string | undefined;
}

export const toPublicUser = (user: User): PublicUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role as Role,
  emailVerified: user.emailVerifiedAt !== null,
});

async function issueSession(
  user: User,
  ctx: SessionContext,
  familyId: string = crypto.randomUUID(),
): Promise<{ session: AuthSession; refreshToken: string }> {
  const { token: accessToken, expiresIn } = await signAccessToken({
    userId: user.id,
    role: user.role as Role,
    tokenVersion: user.tokenVersion,
  });

  const refreshToken = createOpaqueToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      userAgent: ctx.userAgent?.slice(0, 255) ?? null,
      ip: ctx.ip ?? null,
    },
  });

  return { session: { user: toPublicUser(user), accessToken, expiresIn }, refreshToken };
}

async function issueEmailToken(
  userId: string,
  type: 'VERIFY' | 'RESET',
  ttlMs: number,
): Promise<string> {
  const token = createOpaqueToken();
  // Only one live token of a kind per user: asking again invalidates the old link.
  await prisma.emailToken.deleteMany({ where: { userId, type, consumedAt: null } });
  await prisma.emailToken.create({
    data: { userId, type, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

export async function register(input: RegisterInput, ctx: SessionContext) {
  const passwordHash = await hashPassword(input.password);

  let user: User;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone ?? null,
          passwordHash,
          role: 'CUSTOMER', // never taken from the request body
        },
      });
      // A customer without these rows is a special case every later service
      // would have to handle, so they are created atomically with the account.
      await tx.cart.create({ data: { userId: created.id } });
      await tx.wishlist.create({ data: { userId: created.id } });
      return created;
    });
  } catch (err) {
    if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
      throw new AppError(409, ErrorCode.EMAIL_TAKEN, 'That email already has a Grovia account.');
    }
    throw err;
  }

  const token = await issueEmailToken(user.id, 'VERIFY', VERIFY_TOKEN_TTL_MS);
  await mailer.verifyEmail(user.email, user.name, token);

  return issueSession(user, ctx);
}

export async function login(input: LoginInput, ctx: SessionContext) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    // Equalise timing so a missing account is indistinguishable from a wrong password.
    await burnTimingBudget(input.password);
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Email or password is incorrect.');
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Email or password is incorrect.');
  }

  if (!user.isActive) {
    throw new AppError(403, ErrorCode.ACCOUNT_DISABLED, 'This account has been disabled.');
  }

  return issueSession(user, ctx);
}

/**
 * Rotation with reuse detection. See refreshPolicy.ts for why a revoked token
 * means theft rather than a mistake.
 */
export async function refresh(presentedToken: string | undefined, ctx: SessionContext) {
  if (!presentedToken) {
    throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Your session has ended. Sign in again.');
  }

  const tokenHash = hashToken(presentedToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  const decision = classifyRefreshToken(record);

  if (decision.action === 'revoke_family' && record) {
    await prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn(
      { userId: record.userId, familyId: record.familyId },
      'refresh token reuse detected — family revoked',
    );
    throw new AppError(
      401,
      ErrorCode.SESSION_REVOKED,
      'That session was already used. For your safety everything was signed out — please sign in again.',
    );
  }

  if (decision.action === 'reject' || !record) {
    throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Your session has ended. Sign in again.');
  }

  if (!record.user.isActive) {
    throw new AppError(403, ErrorCode.ACCOUNT_DISABLED, 'This account has been disabled.');
  }

  const issued = await issueSession(record.user, ctx, record.familyId);
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date(), replacedById: null },
  });

  return issued;
}

export async function logout(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;
  // Revoke the whole family: signing out should end the session chain, not just
  // the one token the browser happens to be holding.
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(presentedToken) },
    select: { familyId: true },
  });
  if (!record) return;
  await prisma.refreshToken.updateMany({
    where: { familyId: record.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function verifyEmail(token: string): Promise<PublicUser> {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!record || record.type !== 'VERIFY' || record.consumedAt) {
    throw new AppError(400, ErrorCode.TOKEN_INVALID, 'That confirmation link is no longer valid.');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, ErrorCode.TOKEN_EXPIRED, 'That confirmation link has expired.');
  }

  const [, user] = await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);

  return toPublicUser(user);
}

export async function resendVerification(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.emailVerifiedAt) return;
  const token = await issueEmailToken(user.id, 'VERIFY', VERIFY_TOKEN_TTL_MS);
  await mailer.verifyEmail(user.email, user.name, token);
}

/** Always resolves. Whether the address exists is not the caller's business. */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return;
  const token = await issueEmailToken(user.id, 'RESET', RESET_TOKEN_TTL_MS);
  await mailer.resetPassword(user.email, user.name, token);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await prisma.emailToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!record || record.type !== 'RESET' || record.consumedAt) {
    throw new AppError(400, ErrorCode.TOKEN_INVALID, 'That reset link is no longer valid.');
  }
  if (record.expiresAt.getTime() <= Date.now()) {
    throw new AppError(400, ErrorCode.TOKEN_EXPIRED, 'That reset link has expired. Request a new one.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }),
    // Bumping tokenVersion invalidates every live access token; revoking the
    // refresh tokens ends every session. A reset must log out the attacker too.
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await mailer.passwordChanged(record.user.email, record.user.name);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthenticated();

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Your current password is incorrect.');
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await mailer.passwordChanged(user.email, user.name);
}

export async function currentUser(userId: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthenticated();
  return toPublicUser(user);
}
