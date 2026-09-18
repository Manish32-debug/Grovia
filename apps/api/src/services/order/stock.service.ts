import type { Prisma, PrismaClient } from '@prisma/client';
import { ErrorCode, StockReason } from '@grovia/shared';
import { AppError } from '../../lib/AppError.js';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Every stock mutation goes through this module — it is the only place that
 * writes Inventory or StockLedger.
 *
 * Inventory mutations use conditional SQL UPDATEs so concurrent requests
 * cannot oversell stock. The corresponding ledger entry is written using the
 * same transaction client supplied by the caller.
 */
async function ledgerAfterUpdate(
  tx: Tx,
  productId: string,
  delta: number,
  reason: StockReason,
  balanceAfter: number,
  orderId: string | null,
  actorId: string | null,
  note?: string,
): Promise<void> {
  await tx.stockLedger.create({
    data: {
      productId,
      delta,
      reason,
      balanceAfter,
      orderId,
      actorId,
      note,
    },
  });
}

/** Claims sellable stock for an order. Fails atomically if not enough is free. */
export async function reserveStock(
  tx: Tx,
  productId: string,
  quantity: number,
  orderId: string,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Stock reservation quantity must be a positive whole number.',
      { productId },
    );
  }

  const rows = await tx.$queryRaw<{ reserved: number }[]>`
    UPDATE "Inventory"
    SET reserved = reserved + ${quantity}
    WHERE "productId" = ${productId}
      AND stock - reserved >= ${quantity}
    RETURNING reserved
  `;

  if (!rows[0]) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Not enough stock available.',
      { productId },
    );
  }

  await ledgerAfterUpdate(
    tx,
    productId,
    -quantity,
    StockReason.ORDER_RESERVE,
    rows[0].reserved,
    orderId,
    null,
  );
}

/**
 * Converts a reservation into a physical stock deduction.
 * Used for COD orders that skip PENDING_PAYMENT.
 */
export async function commitStock(
  tx: Tx,
  productId: string,
  quantity: number,
  orderId: string,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Stock commit quantity must be a positive whole number.',
      { productId },
    );
  }

  const rows = await tx.$queryRaw<{ stock: number; reserved: number }[]>`
    UPDATE "Inventory"
    SET stock = stock - ${quantity},
        reserved = reserved - ${quantity}
    WHERE "productId" = ${productId}
      AND reserved >= ${quantity}
      AND stock >= ${quantity}
    RETURNING stock, reserved
  `;

  if (!rows[0]) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Stock reservation could not be committed.',
      { productId },
    );
  }

  await ledgerAfterUpdate(
    tx,
    productId,
    0,
    StockReason.ORDER_COMMIT,
    rows[0].stock,
    orderId,
    null,
  );
}

/**
 * Releases a reservation without touching physical stock.
 * Used when online payment fails/expires or an order is cancelled before
 * physical stock has been committed.
 */
export async function releaseStock(
  tx: Tx,
  productId: string,
  quantity: number,
  orderId: string,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Stock release quantity must be a positive whole number.',
      { productId },
    );
  }

  const rows = await tx.$queryRaw<{ reserved: number }[]>`
    UPDATE "Inventory"
    SET reserved = GREATEST(reserved - ${quantity}, 0)
    WHERE "productId" = ${productId}
    RETURNING reserved
  `;

  if (!rows[0]) {
    throw AppError.notFound('Inventory record not found.');
  }

  await ledgerAfterUpdate(
    tx,
    productId,
    quantity,
    StockReason.ORDER_RELEASE,
    rows[0].reserved,
    orderId,
    null,
  );
}

/**
 * Returns physical stock to inventory after a paid order is cancelled/returned.
 */
export async function restockCancelled(
  tx: Tx,
  productId: string,
  quantity: number,
  orderId: string,
): Promise<void> {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Restock quantity must be a positive whole number.',
      { productId },
    );
  }

  const rows = await tx.$queryRaw<{ stock: number }[]>`
    UPDATE "Inventory"
    SET stock = stock + ${quantity}
    WHERE "productId" = ${productId}
    RETURNING stock
  `;

  if (!rows[0]) {
    throw AppError.notFound('Inventory record not found.');
  }

  await ledgerAfterUpdate(
    tx,
    productId,
    quantity,
    StockReason.CANCEL_RESTOCK,
    rows[0].stock,
    orderId,
    null,
  );
}

/**
 * Admin manual inventory adjustment.
 *
 * When the caller supplies a transaction, the mutation participates in that
 * transaction. When no transaction is supplied, the inventory update and
 * ledger insert are wrapped together so they cannot become inconsistent.
 */
export async function adminAdjustStock(
  productId: string,
  delta: number,
  actorId: string,
  note: string,
  tx?: Tx,
): Promise<void> {
  if (!Number.isInteger(delta) || delta === 0) {
    throw AppError.conflict(
      ErrorCode.OUT_OF_STOCK,
      'Stock adjustment must be a non-zero whole number.',
      { productId },
    );
  }

  const applyAdjustment = async (client: Tx): Promise<void> => {
    const rows = await client.$queryRaw<{ stock: number }[]>`
      UPDATE "Inventory"
      SET stock = stock + ${delta}
      WHERE "productId" = ${productId}
        AND stock + ${delta} >= reserved
      RETURNING stock
    `;

    if (!rows[0]) {
      throw AppError.conflict(
        ErrorCode.OUT_OF_STOCK,
        'Adjustment would leave reserved stock negative or inventory does not exist.',
        { productId },
      );
    }

    await ledgerAfterUpdate(
      client,
      productId,
      delta,
      StockReason.ADMIN_ADJUST,
      rows[0].stock,
      null,
      actorId,
      note,
    );
  };

  if (tx) {
    await applyAdjustment(tx);
    return;
  }

  await prismaTransaction(applyAdjustment);
}

/**
 * Starts a standalone Prisma transaction without importing the Prisma singleton
 * at module load time. This keeps the optional transaction-client API intact.
 */
async function prismaTransaction(
  callback: (tx: Prisma.TransactionClient) => Promise<void>,
): Promise<void> {
  const { prisma } = await import('../../config/prisma.js');

  await prisma.$transaction(async (tx) => {
    await callback(tx);
  });
}

export type { Tx };
