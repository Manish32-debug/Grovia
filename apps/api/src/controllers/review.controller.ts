import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as service from '../services/review/review.service.js';

export const create: RequestHandler = async (req, res, next) => {
  try { if (!req.user) throw AppError.unauthenticated(); res.status(201).json({ data: await service.createReview(req.user.id, req.body) }); } catch (e) { next(e); }
};
export const list: RequestHandler = async (req, res, next) => {
  try { const { productId, page, limit } = req.query as unknown as { productId?: string; page: number; limit: number }; if (!productId) throw AppError.badRequest('Product ID is required.'); res.json({ data: await service.listProductReviews(productId, page, limit) }); } catch (e) { next(e); }
};
export const adminList: RequestHandler = async (req, res, next) => {
  try { res.json({ data: await service.listAdminReviews(req.query as never) }); } catch (e) { next(e); }
};
export const moderate: RequestHandler = async (req, res, next) => {
  try { const { reviewId } = req.params as { reviewId: string }; const { status } = req.body as { status: 'APPROVED' | 'REJECTED' }; res.json({ data: await service.moderateReview(reviewId, status) }); } catch (e) { next(e); }
};
