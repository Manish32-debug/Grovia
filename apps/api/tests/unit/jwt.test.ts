import { describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { signAccessToken, verifyAccessToken } from '../../src/services/auth/jwt.js';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const userId = '3f1d2c9a-5b6e-4a7c-8d9e-0f1a2b3c4d5e';

describe('access tokens', () => {
  it('round-trips the claims the API actually authorises on', async () => {
    const { token, expiresIn } = await signAccessToken({ userId, role: 'ADMIN', tokenVersion: 3 });
    const result = await verifyAccessToken(token);

    expect(expiresIn).toBe(900);
    expect(result).toEqual({ ok: true, claims: { sub: userId, role: 'ADMIN', tv: 3 } });
  });

  it('rejects a tampered payload', async () => {
    const { token } = await signAccessToken({ userId, role: 'CUSTOMER', tokenVersion: 0 });
    const [header, , signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: userId, role: 'ADMIN', tv: 0 }),
      'utf8',
    ).toString('base64url');

    await expect(verifyAccessToken(`${header}.${forged}.${signature}`)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('reports expiry separately so the client knows to refresh', async () => {
    const expired = await new SignJWT({ role: 'CUSTOMER', tv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('grovia')
      .setAudience('grovia-api')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    await expect(verifyAccessToken(expired)).resolves.toEqual({ ok: false, reason: 'expired' });
  });

  it('rejects a token minted for a different audience', async () => {
    const wrongAudience = await new SignJWT({ role: 'CUSTOMER', tv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('grovia')
      .setAudience('some-other-service')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(secret);

    await expect(verifyAccessToken(wrongAudience)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects an unsigned "alg: none" token', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub: userId, role: 'ADMIN', tv: 0, iss: 'grovia', aud: 'grovia-api' }),
    ).toString('base64url');

    await expect(verifyAccessToken(`${header}.${payload}.`)).resolves.toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a token whose claims do not match the expected shape', async () => {
    const malformed = await new SignJWT({ role: 'SUPERUSER', tv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer('grovia')
      .setAudience('grovia-api')
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(secret);

    await expect(verifyAccessToken(malformed)).resolves.toEqual({ ok: false, reason: 'invalid' });
  });
});
