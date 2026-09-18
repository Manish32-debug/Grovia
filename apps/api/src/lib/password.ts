import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP's argon2id baseline: 19 MiB, 2 iterations, 1 lane. Raising memory is
 * the cheapest way to hurt an attacker, so tune memoryCost first if this ever
 * needs strengthening.
 */
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string): Promise<string> => hash(plain, ARGON2_OPTIONS);

export async function verifyPassword(digest: string, plain: string): Promise<boolean> {
  try {
    return await verify(digest, plain, ARGON2_OPTIONS);
  } catch {
    // Malformed or truncated hash in the database — treat as a failed login,
    // never as a crash that leaks which accounts have broken records.
    return false;
  }
}

/**
 * A precomputed hash of a value nobody knows. Login verifies against this when
 * the email does not exist, so a missing account costs the same wall-clock time
 * as a wrong password and the endpoint cannot be used to enumerate users.
 */
let decoyHash: string | null = null;
export async function burnTimingBudget(plain: string): Promise<void> {
  decoyHash ??= await hashPassword('decoy-password-never-issued-0000');
  await verifyPassword(decoyHash, plain);
}
