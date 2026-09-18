import type { Coupon, Prisma, PrismaClient } from '@prisma/client';
import {
  DiscountType,
  ErrorCode,
  type CouponDTO,
  type CouponPreviewDTO,
} from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';

type Tx = Prisma.TransactionClient | PrismaClient;

export interface CartLineForCoupon {
  productId: string;
  categoryId: string;
  lineTotalPaise: number;
}

function computeDiscount(coupon: Coupon, subtotalPaise: number): number {
  const raw =
    coupon.discountType === DiscountType.PERCENT
      ? Math.round((subtotalPaise * coupon.value) / 100)
      : coupon.value;

  const capped =
    coupon.maxDiscountPaise != null
      ? Math.min(raw, coupon.maxDiscountPaise)
      : raw;

  return Math.min(Math.max(capped, 0), subtotalPaise);
}

function applicableSubtotal(
  coupon: Coupon,
  lines: CartLineForCoupon[],
): number {
  const hasProductScope = coupon.applicableProductIds.length > 0;
  const hasCategoryScope = coupon.applicableCategoryIds.length > 0;

  // An unscoped coupon applies to the entire active cart.
  if (!hasProductScope && !hasCategoryScope) {
    return lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
  }

  // When scoped, a line is eligible if it matches either configured scope.
  return lines
    .filter(
      (line) =>
        coupon.applicableProductIds.includes(line.productId) ||
        coupon.applicableCategoryIds.includes(line.categoryId),
    )
    .reduce((sum, line) => sum + line.lineTotalPaise, 0);
}

/**
 * Validates a coupon against the current cart and the user's usage history.
 *
 * This function performs validation only. Coupon usage should be recorded as
 * part of the checkout transaction, not during preview.
 */
export async function validateCoupon(
  tx: Tx,
  userId: string,
  code: string,
  lines: CartLineForCoupon[],
): Promise<{ coupon: Coupon; discountPaise: number }> {
  const normalizedCode = code.trim().toUpperCase();

  const coupon = await tx.coupon.findUnique({
    where: { code: normalizedCode },
  });

  const now = new Date();

  const fail = (message: string): never => {
    throw new AppError(409, ErrorCode.COUPON_INVALID, message);
  };

  if (!coupon || !coupon.isActive) {
    return fail('This coupon code is not valid.');
  }

  if (now < coupon.startsAt) {
    return fail('This coupon is not active yet.');
  }

  if (now > coupon.expiresAt) {
    return fail('This coupon has expired.');
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return fail('This coupon has reached its usage limit.');
  }

  const userUsageCount = await tx.couponUsage.count({
    where: {
      couponId: coupon.id,
      userId,
    },
  });

  if (userUsageCount >= coupon.perUserLimit) {
    return fail('You have already used this coupon.');
  }

  const eligibleSubtotal = applicableSubtotal(coupon, lines);

  if (eligibleSubtotal <= 0) {
    return fail('This coupon does not apply to items in your cart.');
  }

  if (eligibleSubtotal < coupon.minOrderPaise) {
    return fail('Add more items to your cart to use this coupon.');
  }

  const discountPaise = computeDiscount(coupon, eligibleSubtotal);

  return { coupon, discountPaise };
}

/** Standalone preview used by the "apply coupon" UI before checkout. */
export async function previewCoupon(
  userId: string,
  code: string,
): Promise<CouponPreviewDTO> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
      },
    },
  });

  const lines: CartLineForCoupon[] = (cart?.items ?? [])
    .filter((item) => item.product.isActive)
    .map((item) => ({
      productId: item.productId,
      categoryId: item.product.categoryId,
      lineTotalPaise: item.product.pricePaise * item.quantity,
    }));

  try {
    const { coupon, discountPaise } = await validateCoupon(
      prisma,
      userId,
      code,
      lines,
    );

    return {
      valid: true,
      reason: null,
      discountPaise,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType as CouponDTO['discountType'],
        value: coupon.value,
        minOrderPaise: coupon.minOrderPaise,
        maxDiscountPaise: coupon.maxDiscountPaise,
        expiresAt: coupon.expiresAt.toISOString(),
      },
    };
  } catch (err) {
    if (err instanceof AppError) {
      return {
        valid: false,
        reason: err.message,
        coupon: null,
        discountPaise: 0,
      };
    }

    throw err;
  }
}
