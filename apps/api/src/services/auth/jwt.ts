import { SignJWT, jwtVerify, errors } from 'jose';
import { z } from 'zod';
import type { Role } from '@grovia/shared';
import { env } from '../../config/env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = 'grovia';
const AUDIENCE = 'grovia-api';

/**
 * `tv` is the user's tokenVersion. Password resets bump it, which invalidates
 * every access token already in the wild without a revocation list.
 */
const claimsSchema = z.object({
  sub: z.string().uuid(),
  role: z.enum(['CUSTOMER', 'ADMIN', 'DELIVERY_PARTNER']),
  tv: z.number().int(),
});

export type AccessTokenClaims = z.infer<typeof claimsSchema>;

export async function signAccessToken(claims: {
  userId: string;
  role: Role;
  tokenVersion: number;
}): Promise<{ token: string; expiresIn: number }> {
  const expiresIn = env.ACCESS_TOKEN_TTL_SECONDS;
  const token = await new SignJWT({ role: claims.role, tv: claims.tokenVersion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);

  return { token, expiresIn };
}

export type VerifyResult =
  | { ok: true; claims: AccessTokenClaims }
  | { ok: false; reason: 'expired' | 'invalid' };

export async function verifyAccessToken(token: string): Promise<VerifyResult> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'], // pinned: never let the token pick its own algorithm
    });
    const parsed = claimsSchema.safeParse(payload);
    return parsed.success ? { ok: true, claims: parsed.data } : { ok: false, reason: 'invalid' };
  } catch (err) {
    if (err instanceof errors.JWTExpired) return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'invalid' };
  }
}
