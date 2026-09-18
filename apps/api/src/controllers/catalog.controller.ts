import type { RequestHandler } from 'express';
import * as catalogService from '../services/catalog/catalog.service.js';

export const listCategories: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ data: await catalogService.listCategories() });
  } catch (err) {
    next(err);
  }
};

export const listProducts: RequestHandler = async (req, res, next) => {
  try {
    res.json({ data: await catalogService.listProducts(req.query as never) });
  } catch (err) {
    next(err);
  }
};

export const getProduct: RequestHandler = async (req, res, next) => {
  try {
    const { slug } = req.params as { slug: string };
    res.json({ data: await catalogService.getProductBySlug(slug) });
  } catch (err) {
    next(err);
  }
};

export const suggest: RequestHandler = async (req, res, next) => {
  try {
    const { q, limit } = req.query as unknown as { q: string; limit: number };
    res.json({ data: await catalogService.suggest(q, limit) });
  } catch (err) {
    next(err);
  }
};
