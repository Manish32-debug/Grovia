import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as cartService from '../services/cart/cart.service.js';

export const getCart: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    res.json({ data: await cartService.getCart(req.user.id) });
  } catch (err) {
    next(err);
  }
};

export const addItem: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { productId, quantity } = req.body as {
      productId: string;
      quantity: number;
    };
    res.status(201).json({
      data: await cartService.addItem(req.user.id, productId, quantity),
    });
  } catch (err) {
    next(err);
  }
};

export const updateItem: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { productId } = req.params as { productId: string };
    const { quantity } = req.body as { quantity: number };
    res.json({
      data: await cartService.updateItem(req.user.id, productId, quantity),
    });
  } catch (err) {
    next(err);
  }
};

export const removeItem: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { productId } = req.params as { productId: string };
    res.json({
      data: await cartService.removeItem(req.user.id, productId),
    });
  } catch (err) {
    next(err);
  }
};

export const clearCart: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    await cartService.clearCart(req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const listWishlist: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    res.json({ data: await cartService.listWishlist(req.user.id) });
  } catch (err) {
    next(err);
  }
};

export const addToWishlist: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { productId } = req.params as { productId: string };
    await cartService.addToWishlist(req.user.id, productId);
    res.status(201).json({ data: { added: true } });
  } catch (err) {
    next(err);
  }
};

export const removeFromWishlist: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) throw AppError.unauthenticated();
    const { productId } = req.params as { productId: string };
    await cartService.removeFromWishlist(req.user.id, productId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
