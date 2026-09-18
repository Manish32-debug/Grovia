import type { Prisma, PrismaClient } from '@prisma/client';
import { NotificationType } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';

type NotificationCopy = {
  title: string;
  body: string;
};

type NotificationData = Record<string, unknown>;

const COPY: Record<NotificationType, (data: NotificationData) => NotificationCopy> = {
  ORDER_PLACED: (d) => ({
    title: 'Order placed',
    body: `Your order ${d.orderNumber} has been placed.`,
  }),
  PAYMENT_SUCCESS: (d) => ({
    title: 'Payment received',
    body: `Payment for order ${d.orderNumber} was successful.`,
  }),
  PAYMENT_FAILED: (d) => ({
    title: 'Payment failed',
    body: `Payment for order ${d.orderNumber} failed. You can retry from your orders.`,
  }),
  ORDER_CONFIRMED: (d) => ({
    title: 'Order confirmed',
    body: `Order ${d.orderNumber} has been confirmed.`,
  }),
  ORDER_PACKING: (d) => ({
    title: 'Being packed',
    body: `Order ${d.orderNumber} is being packed.`,
  }),
  ORDER_READY: (d) => ({
    title: 'Ready for pickup',
    body: `Order ${d.orderNumber} is ready for pickup by our delivery partner.`,
  }),
  ORDER_OUT_FOR_DELIVERY: (d) => ({
    title: 'Out for delivery',
    body: `Order ${d.orderNumber} is out for delivery.`,
  }),
  ORDER_DELIVERED: (d) => ({
    title: 'Delivered',
    body: `Order ${d.orderNumber} has been delivered. Enjoy!`,
  }),
  ORDER_CANCELLED: (d) => ({
    title: 'Order cancelled',
    body: `Order ${d.orderNumber} was cancelled.`,
  }),
  REFUND_PROCESSED: (d) => ({
    title: 'Refund processed',
    body: `Your refund for order ${d.orderNumber} has been processed.`,
  }),
  PRICE_DROP: (d) => ({
    title: 'Price drop',
    body: `${d.productName} just got cheaper.`,
  }),
  BACK_IN_STOCK: (d) => ({
    title: 'Back in stock',
    body: `${d.productName} is back in stock.`,
  }),
};

export async function notify(
  tx: Prisma.TransactionClient | PrismaClient,
  userId: string,
  type: NotificationType,
  orderId: string | null,
  data: NotificationData = {},
): Promise<void> {
  const copyBuilder = COPY[type];

  // Keep notification creation fail-fast if a new enum value is added
  // without adding its corresponding notification copy.
  if (!copyBuilder) {
    throw new Error(`No notification copy configured for type: ${type}`);
  }

  const { title, body } = copyBuilder(data);

  await tx.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      orderId,
    },
  });
}

export async function listNotifications(
  userId: string,
  page: number,
  limit: number,
) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.floor(limit));

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    items,
    total,
    totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    unreadCount,
  };
}

export async function markRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
