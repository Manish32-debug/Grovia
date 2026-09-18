import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Opaque tokens (refresh, email verification, password reset) are random
 * secrets, not signed claims. They are handed to the user in full and stored
 * only as a SHA-256 digest, so a database dump cannot be replayed as sessions.
 *
 * SHA-256 rather than argon2 is correct here: the input is 256 bits of entropy,
 * so there is nothing to brute-force, and these are verified on every refresh.
 */
export const createOpaqueToken = (): string => randomBytes(32).toString('base64url');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('base64');

/** Constant-time comparison for equal-length digests. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
