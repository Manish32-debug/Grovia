import type { Prisma } from '@prisma/client';
import type { CategoryWriteInput, ProductWriteInput } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';
import { adminAdjustStock } from '../order/stock.service.js';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function salePrice(mrpPaise: number, discountPercent: number) {
  return mrpPaise - Math.round((mrpPaise * discountPercent) / 100);
}

export async function dashboard() {
  const [orders, revenue, customers, products, inventories, recentOrders] =
    await Promise.all([
      prisma.order.count({
        where: {
          status: {
            notIn: [
              'PENDING_PAYMENT',
              'PAYMENT_FAILED',
              'EXPIRED',
              'CANCELLED',
            ],
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          status: {
            in: [
              'PLACED',
              'CONFIRMED',
              'PACKING',
              'READY_FOR_PICKUP',
              'OUT_FOR_DELIVERY',
              'DELIVERED',
            ],
          },
        },
        _sum: { totalPaise: true },
      }),
      prisma.user.count({
        where: { role: 'CUSTOMER', isActive: true },
      }),
      prisma.product.count({
        where: { isActive: true },
      }),
      prisma.inventory.findMany({
        select: {
          stock: true,
          reserved: true,
          lowStockThreshold: true,
        },
      }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalPaise: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

  const lowStock = inventories.filter(
    (i) => Math.max(i.stock - i.reserved, 0) <= i.lowStockThreshold,
  ).length;

  const completed = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    select: { totalPaise: true },
  });

  const aov = completed.length
    ? Math.round(
        completed.reduce((sum, order) => sum + order.totalPaise, 0) /
          completed.length,
      )
    : 0;

  return {
    orders,
    revenuePaise: revenue._sum.totalPaise ?? 0,
    customers,
    products,
    lowStock,
    aovPaise: aov,
    recentOrders,
  };
}

export async function listProducts(page = 1, limit = 25) {
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      include: {
        category: true,
        inventory: true,
        images: {
          orderBy: { displayOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count(),
  ]);

  return {
    items,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

export async function createProduct(input: ProductWriteInput) {
  const slug = slugify(input.name);

  const existing = await prisma.product.findUnique({
    where: { slug },
  });

  if (existing) {
    throw AppError.conflict(
      'CONFLICT',
      'A product with this slug already exists.',
    );
  }

  return prisma.product.create({
    data: {
      name: input.name,
      slug,
      brand: input.brand || null,
      description: input.description || null,
      categoryId: input.categoryId,
      unit: input.unit,
      mrpPaise: input.mrpPaise,
      discountPercent: input.discountPercent,
      pricePaise: salePrice(input.mrpPaise, input.discountPercent),
      tags: input.tags,
      nutrition: input.nutrition as Prisma.InputJsonValue | undefined,
      isActive: input.isActive,
    },
    include: {
      category: true,
      inventory: true,
      images: true,
    },
  });
}

export async function updateProduct(
  productId: string,
  input: ProductWriteInput,
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw AppError.notFound('Product not found.');
  }

  const slug = slugify(input.name);

  const clash = await prisma.product.findFirst({
    where: {
      slug,
      id: { not: productId },
    },
  });

  if (clash) {
    throw AppError.conflict(
      'CONFLICT',
      'A product with this slug already exists.',
    );
  }

  return prisma.product.update({
    where: { id: productId },
    data: {
      name: input.name,
      slug,
      brand: input.brand || null,
      description: input.description || null,
      categoryId: input.categoryId,
      unit: input.unit,
      mrpPaise: input.mrpPaise,
      discountPercent: input.discountPercent,
      pricePaise: salePrice(input.mrpPaise, input.discountPercent),
      tags: input.tags,
      nutrition: input.nutrition as Prisma.InputJsonValue | undefined,
      isActive: input.isActive,
    },
    include: {
      category: true,
      inventory: true,
      images: true,
    },
  });
}

export async function deleteProduct(productId: string) {
  await prisma.product.update({
    where: { id: productId },
    data: { isActive: false },
  });
}

export async function adjustInventory(
  productId: string,
  delta: number,
  actorId: string,
  note?: string,
) {
  return prisma.$transaction(async (tx) => {
    await adminAdjustStock(
      productId,
      delta,
      actorId,
      note ?? 'Admin inventory adjustment',
      tx,
    );

    return tx.inventory.findUniqueOrThrow({
      where: { productId },
    });
  });
}

export async function listOrders(
  page = 1,
  limit = 25,
  status?: string,
) {
  const where: Prisma.OrderWhereInput = status
    ? { status: status as never }
    : {};

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function createCategory(input: CategoryWriteInput) {
  return prisma.category.create({
    data: input,
  });
}

export async function updateCategory(
  categoryId: string,
  input: CategoryWriteInput,
) {
  return prisma.category.update({
    where: { id: categoryId },
    data: input,
  });
}

export async function listDeliveryPartners() {
  return prisma.deliveryPartner.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function assignDelivery(
  orderId: string,
  partnerId: string,
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw AppError.notFound('Order not found.');
  }

  if (order.status !== 'READY_FOR_PICKUP') {
    throw AppError.conflict(
      'CONFLICT',
      'Only ready-for-pickup orders can be assigned.',
    );
  }

  const partner = await prisma.deliveryPartner.findUnique({
    where: { id: partnerId },
    include: { user: true },
  });

  if (!partner || !partner.user.isActive) {
    throw AppError.notFound('Delivery partner not found.');
  }

  const existing = await prisma.deliveryAssignment.findUnique({
    where: { orderId },
  });

  if (existing) {
    throw AppError.conflict(
      'CONFLICT',
      'This order already has a delivery assignment.',
    );
  }

  return prisma.deliveryAssignment.create({
    data: {
      orderId,
      partnerId,
    },
    include: {
      partner: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      order: {
        select: {
          orderNumber: true,
        },
      },
    },
  });
}