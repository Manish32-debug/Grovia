import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * GRV-YYMM-00001.
 *
 * Reads nextval() from grovia_order_number_seq (defined in
 * prisma/sql/init-extras.sql). PostgreSQL sequences are concurrency-safe,
 * so concurrent checkouts cannot receive the same sequence value.
 *
 * Sequence gaps are expected if a transaction later rolls back.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient | PrismaClient,
): Promise<string> {
  const rows = await tx.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('grovia_order_number_seq') AS nextval
  `;

  if (rows.length === 0 || rows[0]?.nextval === undefined) {
    throw new Error('Failed to generate the next order number.');
  }

  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const seq = String(rows[0].nextval).padStart(5, '0');

  return `GRV-${yy}${mm}-${seq}`;
}
