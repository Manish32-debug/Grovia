// Single source of truth for every enum crossing the API boundary.
// Phase 2 Prisma enums are declared with these exact string values.

export const Role = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  DELIVERY_PARTNER: 'DELIVERY_PARTNER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  EXPIRED: 'EXPIRED',
  PLACED: 'PLACED',
  CONFIRMED: 'CONFIRMED',
  PACKING: 'PACKING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  CANCELLED: 'CANCELLED',
  RETURN_REQUESTED: 'RETURN_REQUESTED',
  RETURNED: 'RETURNED',
  REFUNDED: 'REFUNDED',
} as const;

export type OrderStatus =
  (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;

export type PaymentStatus =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  UPI_QR: 'UPI_QR',
  UPI_COLLECT: 'UPI_COLLECT',
  CARD: 'CARD',
  NETBANKING: 'NETBANKING',
  COD: 'COD',
} as const;

export type PaymentMethod =
  (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const AddressLabel = {
  HOME: 'HOME',
  WORK: 'WORK',
  COLLEGE: 'COLLEGE',
  OTHER: 'OTHER',
} as const;

export type AddressLabel =
  (typeof AddressLabel)[keyof typeof AddressLabel];

export const DiscountType = {
  PERCENT: 'PERCENT',
  FIXED: 'FIXED',
} as const;

export type DiscountType =
  (typeof DiscountType)[keyof typeof DiscountType];

export const StockReason = {
  ORDER_RESERVE: 'ORDER_RESERVE',
  ORDER_COMMIT: 'ORDER_COMMIT',
  ORDER_RELEASE: 'ORDER_RELEASE',
  CANCEL_RESTOCK: 'CANCEL_RESTOCK',
  ADMIN_ADJUST: 'ADMIN_ADJUST',
  RETURN: 'RETURN',
} as const;

export type StockReason =
  (typeof StockReason)[keyof typeof StockReason];

export const NotificationType = {
  ORDER_PLACED: 'ORDER_PLACED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_PACKING: 'ORDER_PACKING',
  ORDER_READY: 'ORDER_READY',
  ORDER_OUT_FOR_DELIVERY: 'ORDER_OUT_FOR_DELIVERY',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  REFUND_PROCESSED: 'REFUND_PROCESSED',
  PRICE_DROP: 'PRICE_DROP',
  BACK_IN_STOCK: 'BACK_IN_STOCK',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const ReviewStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type ReviewStatus =
  (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const AssignmentStatus = {
  OFFERED: 'OFFERED',
  ACCEPTED: 'ACCEPTED',
  PICKED_UP: 'PICKED_UP',
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
} as const;

export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];
