import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as paymentService from '../services/payment/payment.service.js';

/**
 * req.body is the RAW Buffer here (see app.ts: this route is mounted with
 * express.raw() ahead of express.json()) — HMAC verification requires the
 * untouched bytes, not a re-serialized JSON object.
 */
export const webhook: RequestHandler = async (req, res, next) => {
  try {
    const timestamp = req.header('x-webhook-timestamp');
    const signature = req.header('x-webhook-signature');

    if (!timestamp || !signature) {
      throw AppError.badRequest('Missing webhook signature headers.');
    }

    if (!Buffer.isBuffer(req.body)) {
      throw AppError.badRequest('Invalid webhook body.');
    }

    const rawBody = req.body.toString('utf8');

    await paymentService.processWebhook(
      rawBody,
      timestamp,
      signature,
    );

    res.status(200).json({
      data: { received: true },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Development-only mock-payment confirmation.
 * paymentService performs the production/environment guard as the final
 * authority, so this route cannot create a real payment success in production.
 */
export const devConfirm: RequestHandler = async (req, res, next) => {
  try {
    const { paymentId } = req.params as { paymentId: string };

    await paymentService.devConfirmMockPayment(paymentId);

    res.json({
      data: { confirmed: true },
    });
  } catch (err) {
    next(err);
  }
};
