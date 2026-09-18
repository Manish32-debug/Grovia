import { z } from 'zod';
import { DiscountType } from '../enums.js';

/**
 * Canonical coupon-code validation.
 *
 * The transform order intentionally normalizes whitespace and casing before
 * applying the character/length rules, so callers receive a consistent code.
 */
export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Coupon code must be at least 3 characters.')
  .max(30, 'Coupon code must be at most 30 characters.')
  .regex(
    /^[A-Z0-9_-]+$/,
    'Coupon codes use letters, numbers, - and _ only.',
  );

export const validateCouponQuerySchema = z.object({
  code: couponCodeSchema,
});

export interface CouponDTO {
  code: string;
  description: string;
  discountType: DiscountType;
  value: number;
  minOrderPaise: number;
  maxDiscountPaise: number | null;
  expiresAt: string;
}

export interface CouponPreviewDTO {
  valid: boolean;
  reason: string | null;
  coupon: CouponDTO | null;
  discountPaise: number;
}
