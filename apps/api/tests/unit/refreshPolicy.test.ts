import { describe, expect, it } from 'vitest';
import { classifyRefreshToken } from '../../src/services/auth/refreshPolicy.js';

const now = new Date('2026-09-12T12:00:00Z');
const future = new Date('2026-09-19T12:00:00Z');
const past = new Date('2026-09-05T12:00:00Z');

describe('classifyRefreshToken', () => {
  it('rotates a live, unrevoked token', () => {
    expect(classifyRefreshToken({ expiresAt: future, revokedAt: null }, now)).toEqual({
      action: 'rotate',
    });
  });

  it('rejects a token that is not in the database', () => {
    expect(classifyRefreshToken(null, now)).toEqual({ action: 'reject', reason: 'unknown' });
  });

  it('rejects an expired token without revoking the family', () => {
    expect(classifyRefreshToken({ expiresAt: past, revokedAt: null }, now)).toEqual({
      action: 'reject',
      reason: 'expired',
    });
  });

  it('treats a revoked-but-unexpired token as theft', () => {
    expect(classifyRefreshToken({ expiresAt: future, revokedAt: past }, now)).toEqual({
      action: 'revoke_family',
      reason: 'reuse_detected',
    });
  });

  it('treats reuse as theft even after the token would have expired anyway', () => {
    // Order matters: reuse detection must win over the expiry check, otherwise a
    // patient attacker escapes the family revocation by waiting a week.
    expect(classifyRefreshToken({ expiresAt: past, revokedAt: past }, now)).toEqual({
      action: 'revoke_family',
      reason: 'reuse_detected',
    });
  });

  it('expires exactly at the boundary rather than one tick later', () => {
    expect(classifyRefreshToken({ expiresAt: now, revokedAt: null }, now)).toEqual({
      action: 'reject',
      reason: 'expired',
    });
  });
});
