import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as couponService from '../services/coupon/coupon.service.js';

/**
 * Preview a coupon against the caller's current cart before checkout.
 * Authenticated because eligibility depends on per-user usage history.
 */
export const previewCoupon: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { code } = req.query as { code: string };
    res.json({ data: await couponService.previewCoupon(req.user.id, code) });
  } catch (err) {
    next(err);
  }
};
