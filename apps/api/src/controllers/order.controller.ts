import type { RequestHandler } from 'express';
import type { CheckoutInput, OrderStatus } from '@grovia/shared';
import { prisma } from '../config/prisma.js';
import { AppError } from '../lib/AppError.js';
import * as orderService from '../services/order/order.service.js';
import * as paymentService from '../services/payment/payment.service.js';

export const checkout: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const result = await orderService.checkout(
      req.user.id,
      req.body as CheckoutInput,
    );

    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const listOrders: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const { page, limit, status } = req.query as unknown as {
      page: number;
      limit: number;
      status?: OrderStatus;
    };

    res.json({
      data: await orderService.listOrders(
        req.user.id,
        page,
        limit,
        status,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const getOrder: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const { orderId } = req.params as { orderId: string };

    res.json({
      data: await orderService.getOrder(
        req.user.id,
        req.user.role,
        orderId,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const { orderId } = req.params as { orderId: string };
    const { reason } = req.body as { reason: string };

    res.json({
      data: await orderService.cancelOrder(
        req.user.id,
        req.user.role,
        orderId,
        reason,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const transitionOrder: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const { orderId } = req.params as { orderId: string };
    const { toStatus, note } = req.body as {
      toStatus: OrderStatus;
      note?: string;
    };

    res.json({
      data: await orderService.transitionOrder(
        req.user.id,
        req.user.role,
        orderId,
        toStatus,
        note,
      ),
    });
  } catch (err) {
    next(err);
  }
};

export const reorder: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const { orderId } = req.params as { orderId: string };

    res.json({
      data: await orderService.reorder(req.user.id, orderId),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Server-authoritative payment status check.
 *
 * The paymentId is optional for the initial order-status response. When the
 * client supplies one for polling, it MUST belong to the requested order.
 * This prevents a user from querying another user's payment by ID.
 */
export const paymentStatus: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();

    const { orderId } = req.params as { orderId: string };

    // getOrder performs the existing user/role authorization for the order.
    const order = await orderService.getOrder(
      req.user.id,
      req.user.role,
      orderId,
    );

    const { paymentId } = req.query as { paymentId?: string };

    if (!paymentId) {
      res.json({
        data: {
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
        },
      });
      return;
    }

    // Never pass an arbitrary client-supplied payment ID directly to the
    // gateway-status function. First scope it to this authorized order.
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        orderId,
      },
      select: { id: true },
    });

    if (!payment) {
      throw AppError.notFound('Payment not found for this order.');
    }

    await paymentService.fetchPaymentStatus(payment.id);

    // Re-read the order because fetchPaymentStatus may have settled the
    // payment and advanced the order state.
    const refreshed = await orderService.getOrder(
      req.user.id,
      req.user.role,
      orderId,
    );

    res.json({
      data: {
        orderStatus: refreshed.status,
        paymentStatus: refreshed.paymentStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};
