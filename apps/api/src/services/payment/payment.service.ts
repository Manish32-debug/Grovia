import type { Order, Payment, Prisma, PrismaClient } from '@prisma/client';
import {
  ErrorCode,
  NotificationType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@grovia/shared';
import { env, isProd } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';
import * as cashfree from './cashfree.client.js';
import { notify } from '../notification/notification.service.js';
import * as stock from '../order/stock.service.js';

type Tx = Prisma.TransactionClient | PrismaClient;

type OrderWithItems = Order & {
  items: { productId: string; quantity: number }[];
};

/**
 * Mock/simulation payments exist ONLY when Cashfree credentials are absent
 * (local dev without secrets configured), and are hard-disabled in production.
 */
const ALLOW_MOCK_PAYMENTS = !isProd && !cashfree.isCashfreeConfigured;

function requireRealGatewayInProd(): void {
  if (isProd && !cashfree.isCashfreeConfigured) {
    throw new AppError(
      500,
      ErrorCode.INTERNAL,
      'Payments are not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.',
    );
  }
}

function cashfreeMethodOf(mode: PaymentMethod): 'upi_qr' | 'other' {
  return mode === PaymentMethod.UPI_QR ? 'upi_qr' : 'other';
}

function assertSystemTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
): void {
  const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
    [OrderStatus.PENDING_PAYMENT]: [
      OrderStatus.PLACED,
      OrderStatus.PAYMENT_FAILED,
      OrderStatus.EXPIRED,
    ],
  };

  if (!allowed[from]?.includes(to)) {
    throw AppError.conflict(
      ErrorCode.CONFLICT,
      `Invalid system order transition: ${from} -> ${to}.`,
    );
  }
}

export interface PaymentInitResult {
  paymentId: string;
  gatewayOrderId: string;
  paymentSessionId: string;
  amountPaise: number;
  upiQr: { payload: string; redirectUrl: string | null } | null;
}

/**
 * Starts (or resumes) a payment attempt for an order still in PENDING_PAYMENT.
 * Reuses an already-open attempt instead of creating a second one.
 */
export async function initPayment(
  order: OrderWithItems,
): Promise<PaymentInitResult> {
  requireRealGatewayInProd();

  if (order.status !== OrderStatus.PENDING_PAYMENT) {
    throw AppError.conflict(
      ErrorCode.CONFLICT,
      'This order is not awaiting payment.',
    );
  }

  const open = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      status: {
        in: [PaymentStatus.CREATED, PaymentStatus.PENDING],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: order.userId },
    select: { email: true, phone: true },
  });

  const address = order.addressSnapshot as {
    contactPhone?: string;
  };

  const attemptNumber = open
    ? open.attemptNumber
    : (await countAttempts(order.id)) + 1;

  const orderRef =
    open?.gatewayOrderId ?? `${order.orderNumber}-A${attemptNumber}`;

  if (ALLOW_MOCK_PAYMENTS) {
    return initMockPayment(
      order,
      attemptNumber,
      orderRef,
      open,
    );
  }

  const cfOrder = await cashfree.createOrder({
    orderId: orderRef,
    orderAmountRupees: order.totalPaise / 100,
    customerId: order.userId,
    customerEmail: user.email,
    customerPhone:
      address.contactPhone ?? user.phone ?? '9999999999',
    returnUrl:
      `${env.FRONTEND_URL}/orders/${order.id}?payment=return`,
    notifyUrl:
      `${env.BACKEND_URL}/api/v1/payments/webhook`,
  });

  let upiQr: PaymentInitResult['upiQr'] = null;
  let qrPayloadJson: Prisma.InputJsonValue | undefined;

  if (cashfreeMethodOf(order.paymentMode) === 'upi_qr') {
    const qr = await cashfree.createUpiQr(
      cfOrder.paymentSessionId,
    );

    if (!qr.payload) {
      throw new AppError(
        502,
        ErrorCode.PAYMENT_FAILED,
        'Could not generate a UPI QR code. Please retry.',
      );
    }

    upiQr = {
      payload: qr.payload,
      redirectUrl: qr.redirectUrl,
    };

    qrPayloadJson = {
      payload: qr.payload,
      redirectUrl: qr.redirectUrl,
    };
  }

  const payment = open
    ? await prisma.payment.update({
        where: { id: open.id },
        data: {
          status: PaymentStatus.PENDING,
          qrPayload: qrPayloadJson,
        },
      })
    : await prisma.payment.create({
        data: {
          orderId: order.id,
          gateway: 'cashfree',
          gatewayOrderId: cfOrder.cfOrderId,
          method: order.paymentMode,
          status: PaymentStatus.PENDING,
          amountPaise: order.totalPaise,
          qrPayload: qrPayloadJson,
          attemptNumber,
          expiresAt: new Date(Date.now() + 20 * 60_000),
        },
      });

  return {
    paymentId: payment.id,
    gatewayOrderId: payment.gatewayOrderId,
    paymentSessionId: cfOrder.paymentSessionId,
    amountPaise: order.totalPaise,
    upiQr,
  };
}

async function countAttempts(orderId: string): Promise<number> {
  return prisma.payment.count({
    where: { orderId },
  });
}

/**
 * Local-dev-only stand-in. It never fabricates a successful payment by itself;
 * the separate dev confirmation endpoint must explicitly settle it.
 */
async function initMockPayment(
  order: OrderWithItems,
  attemptNumber: number,
  orderRef: string,
  open: Payment | null,
): Promise<PaymentInitResult> {
  logger.warn(
    { orderId: order.id },
    'Cashfree not configured â€” using dev-only mock payment session',
  );

  const payment =
    open ??
    (await prisma.payment.create({
      data: {
        orderId: order.id,
        gateway: 'mock',
        gatewayOrderId: `mock_${orderRef}`,
        method: order.paymentMode,
        status: PaymentStatus.PENDING,
        amountPaise: order.totalPaise,
        attemptNumber,
        expiresAt: new Date(Date.now() + 20 * 60_000),
      },
    }));

  return {
    paymentId: payment.id,
    gatewayOrderId: payment.gatewayOrderId,
    paymentSessionId: payment.gatewayOrderId,
    amountPaise: order.totalPaise,
    upiQr: null,
  };
}

export async function devConfirmMockPayment(
  paymentId: string,
): Promise<void> {
  if (isProd || !ALLOW_MOCK_PAYMENTS) {
    throw AppError.forbidden(
      'Mock payment confirmation is not available.',
    );
  }

  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  await settlePaymentSuccess(
    payment.orderId,
    payment.id,
    `mock_cf_${payment.id}`,
  );
}

/**
 * Server-authoritative status check. The client never supplies the payment
 * status used to settle the order.
 */
export async function fetchPaymentStatus(
  paymentId: string,
): Promise<PaymentStatus> {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  const terminalStatuses: PaymentStatus[] = [
    PaymentStatus.SUCCESS,
    PaymentStatus.FAILED,
    PaymentStatus.CANCELLED,
    PaymentStatus.EXPIRED,
  ];

  if (terminalStatuses.includes(payment.status as PaymentStatus)) {
    return payment.status as PaymentStatus;
  }

  if (payment.gateway === 'mock') {
    return payment.status as PaymentStatus;
  }

  const gatewayStatus = await cashfree.fetchOrderStatus(
    payment.gatewayOrderId,
  );

  if (gatewayStatus.paymentStatus === 'SUCCESS') {
    await settlePaymentSuccess(
      payment.orderId,
      payment.id,
      gatewayStatus.cfPaymentId ?? undefined,
    );

    return PaymentStatus.SUCCESS;
  }

  if (
    gatewayStatus.paymentStatus === 'FAILED' ||
    gatewayStatus.status === 'EXPIRED'
  ) {
    const status =
      gatewayStatus.paymentStatus === 'FAILED'
        ? PaymentStatus.FAILED
        : PaymentStatus.EXPIRED;

    await settlePaymentFailure(
      payment.orderId,
      payment.id,
      status,
    );

    return status;
  }

  return PaymentStatus.PENDING;
}

/**
 * Marks a payment SUCCESS and advances PENDING_PAYMENT â†’ PLACED.
 */
export async function settlePaymentSuccess(
  orderId: string,
  paymentId: string,
  cfPaymentId?: string,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });

      if (payment.orderId !== order.id) {
        throw AppError.conflict(
          ErrorCode.CONFLICT,
          'Payment does not belong to this order.',
        );
      }

      if (payment.status === PaymentStatus.SUCCESS) return;

      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        logger.warn(
          {
            orderId: order.id,
            paymentId: payment.id,
            orderStatus: order.status,
          },
          'Payment success received for an order no longer awaiting payment',
        );
        return;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.SUCCESS,
          cfPaymentId,
          settledAt: new Date(),
        },
      });

      assertSystemTransitionAllowed(
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PLACED,
      );

      for (const item of order.items) {
        await stock.commitStock(
          tx,
          item.productId,
          item.quantity,
          order.id,
        );
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PLACED,
          placedAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING_PAYMENT,
          toStatus: OrderStatus.PLACED,
          note: 'Payment confirmed',
        },
      });

      await notify(
        tx,
        order.userId,
        NotificationType.PAYMENT_SUCCESS,
        order.id,
        { orderNumber: order.orderNumber },
      );

      await notify(
        tx,
        order.userId,
        NotificationType.ORDER_PLACED,
        order.id,
        { orderNumber: order.orderNumber },
      );
    },
    { isolationLevel: 'Serializable' },
  );
}

/**
 * Releases reservations and frees the slot/coupon when a payment fails
 * or expires.
 */
export async function settlePaymentFailure(
  orderId: string,
  paymentId: string,
  toStatus:
    | typeof PaymentStatus.FAILED
    | typeof PaymentStatus.EXPIRED,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });

      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
      });

      if (payment.orderId !== order.id) {
        throw AppError.conflict(
          ErrorCode.CONFLICT,
          'Payment does not belong to this order.',
        );
      }

      if (payment.status === PaymentStatus.SUCCESS) return;

      if (
        payment.status === toStatus &&
        order.status !== OrderStatus.PENDING_PAYMENT
      ) {
        return;
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: toStatus },
      });

      if (order.status !== OrderStatus.PENDING_PAYMENT) return;

      const orderTarget =
        toStatus === PaymentStatus.FAILED
          ? OrderStatus.PAYMENT_FAILED
          : OrderStatus.EXPIRED;

      assertSystemTransitionAllowed(
        OrderStatus.PENDING_PAYMENT,
        orderTarget,
      );

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
        data: { status: orderTarget },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING_PAYMENT,
          toStatus: orderTarget,
        },
      });

      if (toStatus === PaymentStatus.FAILED) {
        await notify(
          tx,
          order.userId,
          NotificationType.PAYMENT_FAILED,
          order.id,
          { orderNumber: order.orderNumber },
        );
      }
    },
    { isolationLevel: 'Serializable' },
  );
}

export async function refundPayment(
  paymentId: string,
  amountPaise: number,
  reason: string,
): Promise<void> {
  if (
    !Number.isSafeInteger(amountPaise) ||
    amountPaise <= 0
  ) {
    throw AppError.badRequest(
      'Refund amount must be a positive whole number of paise.',
    );
  }

  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
  });

  if (payment.status !== PaymentStatus.SUCCESS) {
    throw AppError.conflict(
      ErrorCode.CONFLICT,
      'Only a successfully paid payment can be refunded.',
    );
  }

  const alreadyRefunded = await prisma.refund.aggregate({
    where: {
      paymentId,
      status: { not: 'FAILED' },
    },
    _sum: { amountPaise: true },
  });

  const refundedSoFar =
    alreadyRefunded._sum.amountPaise ?? 0;

  if (refundedSoFar + amountPaise > payment.amountPaise) {
    throw AppError.conflict(
      ErrorCode.CONFLICT,
      'Refund amount exceeds the amount paid.',
    );
  }

  if (payment.gateway === 'mock') {
    await prisma.refund.create({
      data: {
        paymentId,
        gatewayRefundId:
          `mock_rfnd_${paymentId}_${Date.now()}`,
        amountPaise,
        status: 'COMPLETED',
        reason,
        processedAt: new Date(),
      },
    });

    return;
  }

  const result = await cashfree.createRefund(
    payment.gatewayOrderId,
    amountPaise,
    reason,
  );

  await prisma.refund.create({
    data: {
      paymentId,
      gatewayRefundId: result.gatewayRefundId,
      amountPaise,
      status: 'INITIATED',
      reason,
    },
  });
}

interface CashfreeWebhookBody {
  type: string;
  data: {
    order?: {
      order_id?: string;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
    };
    refund?: {
      cf_refund_id?: string;
      refund_id?: string;
      refund_status?: string;
    };
  };
}

/**
 * Verifies the raw-body signature BEFORE treating the webhook as a valid
 * event. Only valid deliveries are recorded as processed webhook events.
 */
export async function processWebhook(
  rawBody: string,
  timestamp: string,
  signature: string,
): Promise<void> {
  const valid = cashfree.verifyWebhookSignature(
    rawBody,
    timestamp,
    signature,
  );

  if (!valid) {
    logger.error(
      'Cashfree webhook signature invalid â€” ignoring',
    );

    throw new AppError(
      401,
      ErrorCode.WEBHOOK_INVALID,
      'Invalid webhook signature.',
    );
  }

  let parsed: CashfreeWebhookBody;

  try {
    parsed = JSON.parse(
      rawBody,
    ) as CashfreeWebhookBody;
  } catch {
    throw AppError.badRequest(
      'Invalid webhook payload.',
    );
  }

  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId: signature },
  });

  if (existing) return;

  await prisma.webhookEvent.create({
    data: {
      eventId: signature,
      eventType: parsed.type ?? 'UNKNOWN',
      signatureValid: true,
      rawPayload:
        parsed as unknown as Prisma.InputJsonValue,
    },
  });

  const gatewayOrderId =
    parsed.data.order?.order_id;

  if (!gatewayOrderId) return;

  const payment = await prisma.payment.findUnique({
    where: { gatewayOrderId },
  });

  if (!payment) {
    logger.warn(
      { gatewayOrderId },
      'Webhook for unknown payment â€” ignoring',
    );

    return;
  }

  const paymentStatus =
    parsed.data.payment?.payment_status;

  const cfPaymentId =
    parsed.data.payment?.cf_payment_id;

  if (paymentStatus === 'SUCCESS') {
    await settlePaymentSuccess(
      payment.orderId,
      payment.id,
      cfPaymentId != null
        ? String(cfPaymentId)
        : undefined,
    );
  } else if (paymentStatus === 'FAILED') {
    await settlePaymentFailure(
      payment.orderId,
      payment.id,
      PaymentStatus.FAILED,
    );
  } else if (paymentStatus === 'CANCELLED') {
    await settlePaymentFailure(
      payment.orderId,
      payment.id,
      PaymentStatus.EXPIRED,
    );
  }

  const refundStatus =
    parsed.data.refund?.refund_status;

  const gatewayRefundId =
    parsed.data.refund?.cf_refund_id ??
    parsed.data.refund?.refund_id;

  if (refundStatus && gatewayRefundId) {
    await prisma.refund.updateMany({
      where: {
        gatewayRefundId: String(gatewayRefundId),
      },
      data: {
        status:
          refundStatus === 'SUCCESS'
            ? 'COMPLETED'
            : refundStatus === 'FAILED'
              ? 'FAILED'
              : 'PROCESSING',
        processedAt:
          refundStatus === 'SUCCESS'
            ? new Date()
            : undefined,
      },
    });
  }
}
