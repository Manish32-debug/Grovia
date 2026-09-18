import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  ErrorCode,
  OrderStatus,
  PaymentMethod,
  type PaymentStatus,
  Role,
  type CheckoutInput,
  type OrderDTO,
  type OrderItemDTO,
  type OrderStatusEventDTO,
} from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { logger } from '../../config/logger.js';
import { AppError } from '../../lib/AppError.js';
import { getAddressOrThrow } from '../address/address.service.js';
import { getSlotOrThrow } from '../slot/slot.service.js';
import { computeQuote, assertCheckoutable } from '../quote/quote.service.js';
import * as stock from './stock.service.js';
import { nextOrderNumber } from './order-number.service.js';
import { assertTransitionAllowed } from './order-transition.service.js';
import { notify } from '../notification/notification.service.js';
import { recordDeliveredPurchase } from '../intelligence/intelligence.service.js';
import * as paymentService from '../payment/payment.service.js';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: { items: true; history: true; payments: true };
}>;

const orderInclude = {
  items: true,
  history: true,
  payments: true,
} satisfies Prisma.OrderInclude;

function hashPayload(body: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex');
}

export function toOrderDTO(order: OrderWithRelations): OrderDTO {
  const items: OrderItemDTO[] = order.items.map((i) => ({
    productId: i.productId,
    name: i.nameSnapshot,
    brand: i.brandSnapshot,
    unit: i.unitSnapshot,
    image: i.imageSnapshot,
    unitPricePaise: i.unitPricePaise,
    quantity: i.quantity,
    lineTotalPaise: i.lineTotalPaise,
  }));

  const history: OrderStatusEventDTO[] = order.history
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((h) => ({
      status: h.toStatus as OrderStatus,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    }));

  const latestPayment = order.payments
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const slotSnap = order.slotSnapshot as {
    date: string;
    startMinute: number;
    endMinute: number;
  } | null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status as OrderStatus,
    items,
    address: order.addressSnapshot as Record<string, unknown>,
    slot: slotSnap,
    subtotalPaise: order.subtotalPaise,
    discountPaise: order.discountPaise,
    deliveryFeePaise: order.deliveryFeePaise,
    taxPaise: order.taxPaise,
    totalPaise: order.totalPaise,
    paymentMode: order.paymentMode as PaymentMethod,
    paymentStatus: latestPayment
      ? (latestPayment.status as PaymentStatus)
      : null,
    history,
    createdAt: order.createdAt.toISOString(),
    // Must mirror every customer-cancellable fromStatus in order-transition.service.ts.
    canCancel:
      order.status === OrderStatus.PENDING_PAYMENT ||
      order.status === OrderStatus.PLACED,
    canReview: order.status === OrderStatus.DELIVERED,
  };
}

export interface CheckoutResult {
  order: OrderDTO;
  payment: Awaited<ReturnType<typeof paymentService.initPayment>> | null;
}

/**
 * Creates an order using server-authoritative pricing and atomic stock/slot
 * reservation.
 *
 * Online payments start in PENDING_PAYMENT. COD orders start in PLACED.
 *
 * IMPORTANT:
 * The idempotency record is claimed inside the same transaction as order
 * creation. This prevents two concurrent requests with the same key from
 * creating duplicate orders.
 */
export async function checkout(
  userId: string,
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const requestHash = hashPayload(input);

  // Fast path for an already completed idempotent request.
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: input.idempotencyKey },
  });

  if (existing) {
    if (
      existing.userId !== userId ||
      existing.endpoint !== 'checkout'
    ) {
      throw new AppError(
        409,
        ErrorCode.IDEMPOTENCY_CONFLICT,
        'Idempotency key already used.',
      );
    }

    if (existing.requestHash !== requestHash) {
      throw new AppError(
        422,
        ErrorCode.IDEMPOTENCY_CONFLICT,
        'Idempotency key reused with a different request.',
      );
    }

    if (existing.responseBody) {
      return existing.responseBody as unknown as CheckoutResult;
    }
  }

  const address = await getAddressOrThrow(userId, input.addressId);
  const slot = await getSlotOrThrow(input.slotInstanceId);

  const now = new Date();
  const cutoff =
    slot.template.startMinute - slot.template.cutoffMinutes;

  const slotDay = new Date(
    Date.UTC(
      slot.date.getUTCFullYear(),
      slot.date.getUTCMonth(),
      slot.date.getUTCDate(),
    ),
  );

  const today = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );

  const isToday = slotDay.getTime() === today.getTime();

  if (
    slotDay.getTime() < today.getTime() ||
    (isToday &&
      now.getUTCHours() * 60 + now.getUTCMinutes() >= cutoff)
  ) {
    throw new AppError(
      409,
      ErrorCode.SLOT_UNAVAILABLE,
      'This delivery slot is no longer available.',
    );
  }

  const quote = await computeQuote(
    prisma,
    userId,
    input.couponCode,
  );
  assertCheckoutable(quote);

  const isCod = input.paymentMode === PaymentMethod.COD;

  let orderRow: Awaited<
    ReturnType<typeof createOrderTransaction>
  >;

  try {
    orderRow = await createOrderTransaction({
      userId,
      input,
      address,
      slot,
      quote,
      now,
      isCod,
      requestHash,
    });
  } catch (error) {
    // A concurrent request may have claimed the same idempotency key.
    if (
      error instanceof IdempotencyReplayError &&
      error.result
    ) {
      return error.result;
    }

    throw error;
  }

  const full = await prisma.order.findUniqueOrThrow({
    where: { id: orderRow.id },
    include: orderInclude,
  });

  let payment:
    | Awaited<ReturnType<typeof paymentService.initPayment>>
    | null = null;

  if (!isCod) {
    try {
      payment = await paymentService.initPayment(full);
    } catch (error) {
      // Keep the order in PENDING_PAYMENT so it can be safely retried or
      // expired by the stale-order worker. Do not silently mark it paid.
      logger.error(
        {
          err: error,
          orderId: full.id,
        },
        'Payment initialization failed',
      );

      throw error;
    }
  }

  const result: CheckoutResult = {
    order: toOrderDTO(full),
    payment,
  };

  // Persist the completed response so a repeated idempotency request can
  // return the same order/payment initialization result.
  await prisma.idempotencyKey.update({
    where: { key: input.idempotencyKey },
    data: {
      responseStatus: 201,
      responseBody: result as unknown as Prisma.InputJsonValue,
    },
  });

  return result;
}

class IdempotencyReplayError extends Error {
  constructor(
    public readonly result: CheckoutResult | null,
  ) {
    super('Idempotent checkout replay');
    this.name = 'IdempotencyReplayError';
  }
}

async function createOrderTransaction(args: {
  userId: string;
  input: CheckoutInput;
  address: Awaited<ReturnType<typeof getAddressOrThrow>>;
  slot: Awaited<ReturnType<typeof getSlotOrThrow>>;
  quote: Awaited<ReturnType<typeof computeQuote>>;
  now: Date;
  isCod: boolean;
  requestHash: string;
}) {
  const {
    userId,
    input,
    address,
    slot,
    quote,
    now,
    isCod,
    requestHash,
  } = args;

  return prisma.$transaction(
    async (tx) => {
      /*
       * Claim the idempotency key inside the transaction.
       *
       * The unique key constraint prevents concurrent checkout requests from
       * both creating an order. If another transaction already owns it, read
       * the stored response after the transaction commits and replay it.
       */
      try {
        await tx.idempotencyKey.create({
          data: {
            key: input.idempotencyKey,
            userId,
            endpoint: 'checkout',
            requestHash,
            responseStatus: null,
          },
        });
      } catch (error) {
        const existing = await tx.idempotencyKey.findUnique({
          where: { key: input.idempotencyKey },
        });

        if (!existing) throw error;

        if (
          existing.userId !== userId ||
          existing.endpoint !== 'checkout'
        ) {
          throw new AppError(
            409,
            ErrorCode.IDEMPOTENCY_CONFLICT,
            'Idempotency key already used.',
          );
        }

        if (existing.requestHash !== requestHash) {
          throw new AppError(
            422,
            ErrorCode.IDEMPOTENCY_CONFLICT,
            'Idempotency key reused with a different request.',
          );
        }

        if (existing.responseBody) {
          throw new IdempotencyReplayError(
            existing.responseBody as unknown as CheckoutResult,
          );
        }

        // The other request owns an in-progress key. Roll back this
        // transaction instead of creating a second order.
        throw new AppError(
          409,
          ErrorCode.IDEMPOTENCY_CONFLICT,
          'A checkout with this idempotency key is already in progress. Retry shortly.',
        );
      }

      // Atomic slot capacity guard.
      const bookedRows = await tx.$queryRaw<{ booked: number }[]>`
        UPDATE "SlotInstance"
        SET booked = booked + 1
        WHERE id = ${input.slotInstanceId}
          AND booked < capacity
        RETURNING booked
      `;

      if (!bookedRows[0]) {
        throw new AppError(
          409,
          ErrorCode.SLOT_UNAVAILABLE,
          'This delivery slot just filled up.',
        );
      }

      const orderNumber = await nextOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          status: isCod
            ? OrderStatus.PLACED
            : OrderStatus.PENDING_PAYMENT,

          addressSnapshot: {
            label: address.label,
            contactName: address.contactName,
            contactPhone: address.contactPhone,
            line1: address.line1,
            line2: address.line2,
            landmark: address.landmark,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },

          slotInstanceId: slot.id,

          slotSnapshot: {
            date: slot.date.toISOString().slice(0, 10),
            startMinute: slot.template.startMinute,
            endMinute: slot.template.endMinute,
          },

          couponId: quote.coupon.couponId,
          subtotalPaise: quote.subtotalPaise,
          discountPaise: quote.discountPaise,
          deliveryFeePaise: quote.deliveryFeePaise,
          taxPaise: quote.taxPaise,
          totalPaise: quote.totalPaise,
          paymentMode: input.paymentMode,
          placedAt: isCod ? now : null,
        },
      });

      const activeLines = quote.lines.filter(
        (line) =>
          line.isActive &&
          line.available >= line.quantity,
      );

      if (activeLines.length !== quote.lines.length) {
        throw new AppError(
          409,
          ErrorCode.OUT_OF_STOCK,
          'One or more cart items are no longer available in the requested quantity.',
        );
      }

      await tx.orderItem.createMany({
        data: activeLines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          nameSnapshot: line.name,
          brandSnapshot: line.brand,
          unitSnapshot: line.unit,
          imageSnapshot: line.image,
          unitPricePaise: line.unitPricePaise,
          discountPaise: 0,
          quantity: line.quantity,
          lineTotalPaise: line.lineTotalPaise,
        })),
      });

      for (const line of activeLines) {
        await stock.reserveStock(
          tx,
          line.productId,
          line.quantity,
          order.id,
        );

        if (isCod) {
          await stock.commitStock(
            tx,
            line.productId,
            line.quantity,
            order.id,
          );
        }
      }

      if (quote.coupon.couponId) {
        await tx.couponUsage.create({
          data: {
            couponId: quote.coupon.couponId,
            userId,
            orderId: order.id,
            discountAppliedPaise: quote.discountPaise,
          },
        });

        await tx.coupon.update({
          where: { id: quote.coupon.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: order.status,
          actorId: userId,
          actorRole: Role.CUSTOMER,
        },
      });

      await tx.cartItem.deleteMany({
        where: { cart: { userId } },
      });

      if (isCod) {
        await notify(
          tx,
          userId,
          'ORDER_PLACED',
          order.id,
          { orderNumber },
        );
      }

      return order;
    },
    {
      isolationLevel: 'Serializable',
    },
  );
}

export async function getOrder(
  userId: string,
  role: Role,
  orderId: string,
): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: orderInclude,
  });

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (
    role === Role.CUSTOMER &&
    order.userId !== userId
  ) {
    throw AppError.forbidden();
  }

  return toOrderDTO(order);
}

export async function listOrders(
  userId: string,
  page: number,
  limit: number,
  status?: OrderStatus,
): Promise<{
  items: OrderDTO[];
  total: number;
  totalPages: number;
}> {
  const where: Prisma.OrderWhereInput = {
    userId,
    ...(status ? { status } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.order.count({ where }),
  ]);

  return {
    items: rows.map(toOrderDTO),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function cancelOrder(
  userId: string,
  role: Role,
  orderId: string,
  reason: string,
): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
    },
  });

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (
    role === Role.CUSTOMER &&
    order.userId !== userId
  ) {
    throw AppError.forbidden();
  }

  assertTransitionAllowed(
    order.status as OrderStatus,
    OrderStatus.CANCELLED,
    role,
  );

  /*
   * A successfully paid online order requires a refund. Do not mark the
   * order cancelled if refund initiation fails, otherwise the DB can claim
   * cancellation while the customer still has a successful payment.
   */
  const successfulPayment = order.payments.find(
    (p) => p.status === 'SUCCESS',
  );

  if (successfulPayment) {
    await paymentService.refundPayment(
      successfulPayment.id,
      order.totalPaise,
      reason,
    );
  }

  await prisma.$transaction(
    async (tx) => {
      for (const item of order.items) {
        if (order.status === OrderStatus.PENDING_PAYMENT) {
          await stock.releaseStock(
            tx,
            item.productId,
            item.quantity,
            order.id,
          );
        } else {
          await stock.restockCancelled(
            tx,
            item.productId,
            item.quantity,
            order.id,
          );
        }
      }

      if (order.slotInstanceId) {
        await tx.$queryRaw`
          UPDATE "SlotInstance"
          SET booked = GREATEST(booked - 1, 0)
          WHERE id = ${order.slotInstanceId}
        `;
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          actorId: userId,
          actorRole: role,
          note: reason,
        },
      });

      if (order.couponId) {
        const usage = await tx.couponUsage.findFirst({
          where: {
            couponId: order.couponId,
            orderId: order.id,
          },
        });

        if (usage) {
          await tx.couponUsage.delete({
            where: { id: usage.id },
          });

          await tx.coupon.update({
            where: { id: order.couponId },
            data: {
              usedCount: { decrement: 1 },
            },
          });
        }
      }

      await notify(
        tx,
        order.userId,
        'ORDER_CANCELLED',
        order.id,
        { orderNumber: order.orderNumber },
      );
    },
    {
      isolationLevel: 'Serializable',
    },
  );

  const full = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: orderInclude,
  });

  return toOrderDTO(full);
}

export async function transitionOrder(
  actorId: string,
  role: Role,
  orderId: string,
  toStatus: OrderStatus,
  note: string | undefined,
): Promise<OrderDTO> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  assertTransitionAllowed(
    order.status as OrderStatus,
    toStatus,
    role,
  );

  const timestamps: Partial<
    Record<OrderStatus, Record<string, Date>>
  > = {
    [OrderStatus.CONFIRMED]: {
      confirmedAt: new Date(),
    },
    [OrderStatus.DELIVERED]: {
      deliveredAt: new Date(),
    },
  };

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: toStatus,
        ...(timestamps[toStatus] ?? {}),
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus,
        actorId,
        actorRole: role,
        note,
      },
    });

    const notifyMap: Partial<
      Record<OrderStatus, Parameters<typeof notify>[2]>
    > = {
      [OrderStatus.CONFIRMED]: 'ORDER_CONFIRMED',
      [OrderStatus.PACKING]: 'ORDER_PACKING',
      [OrderStatus.READY_FOR_PICKUP]: 'ORDER_READY',
      [OrderStatus.OUT_FOR_DELIVERY]:
        'ORDER_OUT_FOR_DELIVERY',
      [OrderStatus.DELIVERED]: 'ORDER_DELIVERED',
    };

    const type = notifyMap[toStatus];

    if (type) {
      await notify(
        tx,
        order.userId,
        type,
        orderId,
        { orderNumber: order.orderNumber },
      );
    }

    if (toStatus === OrderStatus.DELIVERED) {
      await recordDeliveredPurchase(tx, order.userId, order.items, new Date());
    }
  });

  const full = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: orderInclude,
  });

  return toOrderDTO(full);
}

/**
 * Reorder: adds every still-active item from a past order back into the cart.
 *
 * Current price and current stock are always used. Historical order prices
 * are never reused.
 */
export async function reorder(
  userId: string,
  orderId: string,
): Promise<{ addedCount: number; skipped: string[] }> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },
    include: { items: true },
  });

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  let addedCount = 0;
  const skipped: string[] = [];

  for (const item of order.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { inventory: true },
    });

    const available = Math.max(
      0,
      (product?.inventory?.stock ?? 0) -
        (product?.inventory?.reserved ?? 0),
    );

    if (
      !product ||
      !product.isActive ||
      available <= 0
    ) {
      skipped.push(item.nameSnapshot);
      continue;
    }

    const qty = Math.min(
      item.quantity,
      available,
      50,
    );

    await prisma.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: item.productId,
        },
      },
      create: {
        cartId: cart.id,
        productId: item.productId,
        quantity: qty,
      },
      update: {
        quantity: qty,
      },
    });

    addedCount++;
  }

  return {
    addedCount,
    skipped,
  };
}

/**
 * Releases reservations for online-payment orders abandoned past their
 * payment window.
 *
 * Coupon usage is also released because a PENDING_PAYMENT order did not
 * complete successfully.
 */
export async function expireStalePendingOrders(
  olderThanMinutes = 20,
): Promise<number> {
  const cutoff = new Date(
    Date.now() - olderThanMinutes * 60_000,
  );

  const stale = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING_PAYMENT,
      createdAt: { lt: cutoff },
    },
    include: {
      items: true,
    },
  });

  let expiredCount = 0;

  for (const order of stale) {
    try {
      await prisma.$transaction(
        async (tx) => {
          // Only expire an order that is still pending. This prevents a
          // payment webhook that won the race from being overwritten.
          const current = await tx.order.findUnique({
            where: { id: order.id },
          });

          if (
            !current ||
            current.status !== OrderStatus.PENDING_PAYMENT
          ) {
            return;
          }

          /*
           * Check the gateway before expiring when possible. If the payment
           * has succeeded, leave the order for payment reconciliation instead
           * of releasing its stock.
           */
          const payment = await tx.payment.findFirst({
            where: {
              orderId: order.id,
              status: {
                in: ['PENDING', 'CREATED'],
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (payment?.gatewayOrderId) {
            try {
              const gatewayStatus =
                await paymentService.fetchPaymentStatus(
                  payment.id,
                );

              if (
                gatewayStatus === 'SUCCESS'
              ) {
                return;
              }
            } catch (error) {
              // If the gateway cannot be checked, do not release stock based
              // on an uncertain payment state.
              logger.warn(
                {
                  err: error,
                  orderId: order.id,
                },
                'Could not verify stale payment before expiry; leaving order pending',
              );

              return;
            }
          }

          for (const item of order.items) {
            await stock.releaseStock(
              tx,
              item.productId,
              item.quantity,
              order.id,
            );
          }

          if (order.slotInstanceId) {
            await tx.$queryRaw`
              UPDATE "SlotInstance"
              SET booked = GREATEST(booked - 1, 0)
              WHERE id = ${order.slotInstanceId}
            `;
          }

          if (order.couponId) {
            const usage = await tx.couponUsage.findFirst({
              where: {
                couponId: order.couponId,
                orderId: order.id,
              },
            });

            if (usage) {
              await tx.couponUsage.delete({
                where: { id: usage.id },
              });

              await tx.coupon.update({
                where: { id: order.couponId },
                data: {
                  usedCount: { decrement: 1 },
                },
              });
            }
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.EXPIRED,
            },
          });

          await tx.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: OrderStatus.PENDING_PAYMENT,
              toStatus: OrderStatus.EXPIRED,
              note: 'Payment window expired',
            },
          });
        },
        {
          isolationLevel: 'Serializable',
        },
      );

      expiredCount++;
    } catch (error) {
      logger.error(
        {
          err: error,
          orderId: order.id,
        },
        'Failed to expire stale pending order',
      );
    }
  }

  return expiredCount;
}

