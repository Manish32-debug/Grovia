import { z } from 'zod';
import { OrderStatus, PaymentMethod, type PaymentStatus } from '../enums.js';
import { couponCodeSchema } from './coupon.js';

/**
 * Checkout request validation.
 *
 * idempotencyKey is required for safe retry/duplicate-request handling.
 * Coupon codes are normalized by couponCodeSchema before reaching the service.
 */
export const checkoutSchema = z.object({
  addressId: z.string().uuid('Invalid address ID.'),
  slotInstanceId: z.string().uuid('Invalid slot instance ID.'),
  couponCode: couponCodeSchema.optional(),
  paymentMode: z.nativeEnum(PaymentMethod),
  idempotencyKey: z
    .string()
    .trim()
    .min(8, 'Idempotency key must be at least 8 characters.')
    .max(128, 'Idempotency key must be at most 128 characters.'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderIdParamsSchema = z.object({
  orderId: z.string().uuid('Invalid order ID.'),
});

export const orderListQuerySchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  page: z.coerce
    .number()
    .int('Page must be a whole number.')
    .positive('Page must be greater than 0.')
    .max(1000, 'Page cannot exceed 1000.')
    .optional()
    .default(1),
  limit: z.coerce
    .number()
    .int('Limit must be a whole number.')
    .positive('Limit must be greater than 0.')
    .max(50, 'Limit cannot exceed 50.')
    .optional()
    .default(10),
});

export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Cancellation reason must be at least 3 characters.')
    .max(300, 'Cancellation reason must be at most 300 characters.'),
});

export const transitionOrderSchema = z.object({
  toStatus: z.nativeEnum(OrderStatus),
  note: z
    .string()
    .trim()
    .max(300, 'Transition note cannot exceed 300 characters.')
    .optional(),
});

export interface OrderItemDTO {
  productId: string;
  name: string;
  brand: string | null;
  unit: string;
  image: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface OrderStatusEventDTO {
  status: OrderStatus;
  note: string | null;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItemDTO[];
  address: Record<string, unknown>;
  slot: { date: string; startMinute: number; endMinute: number } | null;
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentMode: PaymentMethod;
  paymentStatus: PaymentStatus | null;
  history: OrderStatusEventDTO[];
  createdAt: string;
  canCancel: boolean;
  canReview: boolean;
}

// ─────────────────────────────── payment ───────────────────────────────

export interface PaymentInitResultDTO {
  gatewayOrderId: string;
  paymentSessionId: string;
  amountPaise: number;

  /**
   * Present only when a UPI QR payment session is created.
   * The frontend should render/use the returned Cashfree QR payload;
   * it must never be generated or treated as a successful payment locally.
   */
  upiQr: {
    payload: string;
    redirectUrl: string | null;
  } | null;
}

/**
 * Cashfree webhook headers required for signature verification.
 *
 * Header names are intentionally kept in their canonical lowercase form
 * because Express/header handling is case-insensitive.
 */
export const webhookSignatureHeaders = z.object({
  'x-webhook-timestamp': z.string().trim().min(1, 'Missing webhook timestamp.'),
  'x-webhook-signature': z.string().trim().min(1, 'Missing webhook signature.'),
});
