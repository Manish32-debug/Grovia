import type { Prisma, PrismaClient } from '@prisma/client';
import { ErrorCode } from '@grovia/shared';
import { AppError } from '../../lib/AppError.js';
import { validateCoupon } from '../coupon/coupon.service.js';

type Tx = Prisma.TransactionClient | PrismaClient;

/** Flat delivery fee; waived once the (pre-discount) subtotal clears the free threshold. */
const DELIVERY_FEE_PAISE = 2900;
const FREE_DELIVERY_THRESHOLD_PAISE = 19900;

export interface QuoteLine {
  productId: string;
  categoryId: string;
  name: string;
  brand: string | null;
  unit: string;
  image: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  gstBasis: number;
  /** Sellable stock right now (stock - reserved). */
  available: number;
  isActive: boolean;
}

export interface Quote {
  lines: QuoteLine[];
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  coupon: { couponId: string | null; code: string | null };
}

/**
 * Prices the user's current cart server-side — the frontend never sends
 * prices or totals. Every product's CURRENT price/stock/active state is read
 * fresh from the DB; nothing is trusted from the client or from history.
 *
 * This is a quote, not a stock reservation. Stock must be reserved atomically
 * during the actual checkout transaction after this quote is validated.
 */
export async function computeQuote(
  tx: Tx,
  userId: string,
  couponCode?: string,
): Promise<Quote> {
  const cart = await tx.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
              images: true,
              inventory: true,
            },
          },
        },
      },
    },
  });

  const lines: QuoteLine[] = (cart?.items ?? []).map((item) => {
    const p = item.product;
    const primaryImage = p.images.find((image) => image.isPrimary) ?? p.images[0];
    const sellable = Math.max(
      (p.inventory?.stock ?? 0) - (p.inventory?.reserved ?? 0),
      0,
    );

    return {
      productId: p.id,
      categoryId: p.categoryId,
      name: p.name,
      brand: p.brand,
      unit: p.unit,
      image: primaryImage?.url ?? null,
      unitPricePaise: p.pricePaise,
      quantity: item.quantity,
      lineTotalPaise: p.pricePaise * item.quantity,
      gstBasis: p.category.gstBasis,
      available: sellable,
      isActive: p.isActive,
    };
  });

  const subtotalPaise = lines.reduce(
    (sum, line) => sum + line.lineTotalPaise,
    0,
  );

  const taxPaise = lines.reduce(
    (sum, line) =>
      sum + Math.round((line.lineTotalPaise * line.gstBasis) / 10000),
    0,
  );

  const deliveryFeePaise =
    subtotalPaise >= FREE_DELIVERY_THRESHOLD_PAISE || subtotalPaise === 0
      ? 0
      : DELIVERY_FEE_PAISE;

  let discountPaise = 0;
  let couponId: string | null = null;
  let normalizedCode: string | null = null;

  if (couponCode?.trim()) {
    const { coupon, discountPaise: couponDiscountPaise } =
      await validateCoupon(
        tx,
        userId,
        couponCode,
        lines.map((line) => ({
          productId: line.productId,
          categoryId: line.categoryId,
          lineTotalPaise: line.lineTotalPaise,
        })),
      );

    discountPaise = couponDiscountPaise;
    couponId = coupon.id;
    normalizedCode = coupon.code;
  }

  const totalPaise =
    subtotalPaise - discountPaise + deliveryFeePaise + taxPaise;

  return {
    lines,
    subtotalPaise,
    discountPaise,
    deliveryFeePaise,
    taxPaise,
    totalPaise,
    coupon: {
      couponId,
      code: normalizedCode,
    },
  };
}

/** Throws if the cart isn't in a state that can actually be checked out. */
export function assertCheckoutable(quote: Quote): void {
  if (quote.lines.length === 0) {
    throw AppError.badRequest('Your cart is empty.');
  }

  const unavailable = quote.lines.filter(
    (line) => !line.isActive || line.available < line.quantity,
  );

  if (unavailable.length > 0) {
    throw new AppError(
      409,
      ErrorCode.OUT_OF_STOCK,
      'One or more items in your cart are no longer available in the requested quantity.',
      { productIds: unavailable.map((line) => line.productId) },
    );
  }

  if (quote.totalPaise <= 0) {
    throw AppError.badRequest('Order total must be greater than zero.');
  }
}
