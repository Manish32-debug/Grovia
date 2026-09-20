import type { RequestHandler } from 'express';
import { AppError } from '../lib/AppError.js';
import * as service from '../services/admin/admin.service.js';

function queryNumber(
  value: unknown,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

export const dashboard: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    res.json({
      data: await service.dashboard(),
    });
  } catch (e) {
    next(e);
  }
};

export const products: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const q = req.query as {
      page?: unknown;
      limit?: unknown;
    };

    res.json({
      data: await service.listProducts(
        queryNumber(q.page),
        queryNumber(q.limit),
      ),
    });
  } catch (e) {
    next(e);
  }
};

export const createProduct: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    res.status(201).json({
      data: await service.createProduct(req.body),
    });
  } catch (e) {
    next(e);
  }
};

export const updateProduct: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { productId } = req.params as {
      productId: string;
    };

    res.json({
      data: await service.updateProduct(
        productId,
        req.body,
      ),
    });
  } catch (e) {
    next(e);
  }
};

export const deleteProduct: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { productId } = req.params as {
      productId: string;
    };

    await service.deleteProduct(productId);

    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

export const inventory: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user) {
      throw AppError.unauthenticated();
    }

    const { productId } = req.params as {
      productId: string;
    };

    const body = req.body as {
      delta: number;
      note?: string;
    };

    res.json({
      data: await service.adjustInventory(
        productId,
        body.delta,
        req.user.id,
        body.note,
      ),
    });
  } catch (e) {
    next(e);
  }
};

export const orders: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const q = req.query as {
      page?: unknown;
      limit?: unknown;
      status?: unknown;
    };

    res.json({
      data: await service.listOrders(
        queryNumber(q.page),
        queryNumber(q.limit),
        typeof q.status === 'string'
          ? q.status
          : undefined,
      ),
    });
  } catch (e) {
    next(e);
  }
};

export const categories: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    res.json({
      data: await service.listCategories(),
    });
  } catch (e) {
    next(e);
  }
};

export const createCategory: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    res.status(201).json({
      data: await service.createCategory(req.body),
    });
  } catch (e) {
    next(e);
  }
};

export const updateCategory: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const { categoryId } = req.params as {
      categoryId: string;
    };

    res.json({
      data: await service.updateCategory(
        categoryId,
        req.body,
      ),
    });
  } catch (e) {
    next(e);
  }
};

export const partners: RequestHandler = async (
  _req,
  res,
  next,
) => {
  try {
    res.json({
      data: await service.listDeliveryPartners(),
    });
  } catch (e) {
    next(e);
  }
};

export const assignDelivery: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const body = req.body as {
      orderId: string;
      partnerId: string;
    };

    res.status(201).json({
      data: await service.assignDelivery(
        body.orderId,
        body.partnerId,
      ),
    });
  } catch (e) {
    next(e);
  }
};