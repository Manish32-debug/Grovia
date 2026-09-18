import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashToken, safeEqual } from '../../src/lib/crypto.js';

describe('opaque tokens', () => {
  it('produces url-safe tokens with 256 bits of entropy', () => {
    const token = createOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, 'base64url')).toHaveLength(32);
  });

  it('never repeats across a large sample', () => {
    const tokens = new Set(Array.from({ length: 5000 }, createOpaqueToken));
    expect(tokens.size).toBe(5000);
  });

  it('hashes deterministically and irreversibly', () => {
    const token = createOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).not.toBe(hashToken(createOpaqueToken()));
  });

  it('compares equal and unequal digests correctly', () => {
    const a = hashToken('one');
    expect(safeEqual(a, a)).toBe(true);
    expect(safeEqual(a, hashToken('two'))).toBe(false);
    expect(safeEqual(a, 'short')).toBe(false);
  });
});
