/**
 * The security-critical decision in refresh-token rotation, isolated as a pure
 * function so it can be exhaustively tested without a database.
 *
 * Rotation means every refresh issues a new token and revokes the one used.
 * Therefore a *revoked* token being presented is not a mistake — it means
 * someone is replaying a token that was already spent, i.e. it was stolen (or
 * the legitimate client raced itself). The safe response is to revoke the whole
 * family, forcing both the attacker and the victim to sign in again.
 */
export interface RefreshTokenRecord {
  expiresAt: Date;
  revokedAt: Date | null;
}

export type RefreshDecision =
  | { action: 'rotate' }
  | { action: 'reject'; reason: 'unknown' | 'expired' }
  | { action: 'revoke_family'; reason: 'reuse_detected' };

export function classifyRefreshToken(
  record: RefreshTokenRecord | null,
  now: Date = new Date(),
): RefreshDecision {
  if (!record) return { action: 'reject', reason: 'unknown' };
  if (record.revokedAt !== null) return { action: 'revoke_family', reason: 'reuse_detected' };
  if (record.expiresAt.getTime() <= now.getTime()) return { action: 'reject', reason: 'expired' };
  return { action: 'rotate' };
}
