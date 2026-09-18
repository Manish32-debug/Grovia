import { describe, expect, it } from 'vitest';
import { burnTimingBudget, hashPassword, verifyPassword } from '../../src/lib/password.js';

describe('password hashing', () => {
  it('produces an argon2id digest, salted per call', async () => {
    const a = await hashPassword('correct horse battery 9');
    const b = await hashPassword('correct horse battery 9');
    expect(a.startsWith('$argon2id$')).toBe(true);
    expect(a).not.toBe(b);
  });

  it('verifies the right password and rejects the wrong one', async () => {
    const digest = await hashPassword('correct horse battery 9');
    await expect(verifyPassword(digest, 'correct horse battery 9')).resolves.toBe(true);
    await expect(verifyPassword(digest, 'correct horse battery 8')).resolves.toBe(false);
  });

  it('returns false rather than throwing on a corrupted digest', async () => {
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false);
    await expect(verifyPassword('', 'anything')).resolves.toBe(false);
  });

  it('burns a comparable amount of time when the account does not exist', async () => {
    const digest = await hashPassword('some password 1');

    const t0 = performance.now();
    await verifyPassword(digest, 'wrong password 1');
    const realMs = performance.now() - t0;

    const t1 = performance.now();
    await burnTimingBudget('wrong password 1');
    const decoyMs = performance.now() - t1;

    // Same order of magnitude is what matters; exact parity is not achievable.
    expect(decoyMs).toBeGreaterThan(realMs / 4);
    expect(decoyMs).toBeLessThan(realMs * 4);
  }, 20_000);
});
