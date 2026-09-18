import { prisma } from '../../config/prisma.js';

const SALES_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PACKING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export async function rebuildDemandStats(): Promise<number> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  const products = await prisma.product.findMany({
    select: { id: true },
  });

  let count = 0;

  for (const product of products) {
    const [s7, s30] = await Promise.all([
      prisma.orderItem.aggregate({
        where: {
          productId: product.id,
          order: {
            status: { in: [...SALES_STATUSES] },
            createdAt: { gte: d7 },
          },
        },
        _sum: { quantity: true },
      }),
      prisma.orderItem.aggregate({
        where: {
          productId: product.id,
          order: {
            status: { in: [...SALES_STATUSES] },
            createdAt: { gte: d30 },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const sales7 = s7._sum.quantity ?? 0;
    const sales30 = s30._sum.quantity ?? 0;
    const avg = sales30 / 30;
    const ewma = (sales7 / 7) * 0.6 + avg * 0.4;

    const inventory = await prisma.inventory.findUnique({
      where: { productId: product.id },
    });

    const sellable = Math.max(
      (inventory?.stock ?? 0) - (inventory?.reserved ?? 0),
      0,
    );

    await prisma.productDemandStat.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        salesLast7: sales7,
        salesLast30: sales30,
        avgDailySales: avg,
        ewmaDailySales: ewma,
        daysRemaining: ewma > 0 ? sellable / ewma : null,
      },
      update: {
        salesLast7: sales7,
        salesLast30: sales30,
        avgDailySales: avg,
        ewmaDailySales: ewma,
        daysRemaining: ewma > 0 ? sellable / ewma : null,
        computedAt: now,
      },
    });

    count++;
  }

  return count;
}

export async function demandDashboard() {
  return prisma.productDemandStat.findMany({
    include: {
      product: {
        select: {
          id: true,
          name: true,
          pricePaise: true,
          inventory: {
            select: {
              stock: true,
              reserved: true,
              lowStockThreshold: true,
            },
          },
        },
      },
    },
    orderBy: [{ daysRemaining: 'asc' }],
  });
}

export async function smartBasket(userId: string) {
  const stats = await prisma.userProductStat.findMany({
    where: {
      userId,
      lastPurchasedAt: { not: null },
    },
    include: {
      product: {
        include: {
          inventory: true,
          images: true,
        },
      },
    },
    orderBy: { lastPurchasedAt: 'desc' },
    take: 30,
  });

  return stats
    .filter(
      (stat) =>
        stat.product.isActive &&
        (stat.product.inventory?.stock ?? 0) -
          (stat.product.inventory?.reserved ?? 0) >
          0,
    )
    .map((stat) => ({
      productId: stat.productId,
      name: stat.product.name,
      unit: stat.product.unit,
      pricePaise: stat.product.pricePaise,
      quantity: Math.max(1, stat.medianQuantity),
      lastPurchasedAt: stat.lastPurchasedAt?.toISOString() ?? null,
      medianIntervalDays: stat.medianIntervalDays,
    }));
}

export async function recommendations(
  userId: string,
  productId?: string,
) {
  if (productId) {
    const edges = await prisma.productAssociation.findMany({
      where: { productAId: productId },
      include: {
        productB: {
          include: {
            images: true,
            inventory: true,
          },
        },
      },
      orderBy: { confidence: 'desc' },
      take: 10,
    });

    return edges
      .filter((edge) => edge.productB.isActive)
      .map((edge) => ({
        productId: edge.productB.id,
        name: edge.productB.name,
        slug: edge.productB.slug,
        pricePaise: edge.productB.pricePaise,
        image:
          edge.productB.images.find((image) => image.isPrimary)?.url ??
          edge.productB.images[0]?.url ??
          null,
        confidence: edge.confidence,
      }));
  }

  const stats = await prisma.userProductStat.findMany({
    where: { userId },
    orderBy: { purchaseCount: 'desc' },
    take: 10,
    include: {
      product: {
        include: {
          images: true,
          inventory: true,
        },
      },
    },
  });

  return stats
    .filter((stat) => stat.product.isActive)
    .map((stat) => ({
      productId: stat.productId,
      name: stat.product.name,
      slug: stat.product.slug,
      pricePaise: stat.product.pricePaise,
      image:
        stat.product.images.find((image) => image.isPrimary)?.url ??
        stat.product.images[0]?.url ??
        null,
      score: stat.purchaseCount,
    }));
}

export async function recordDeliveredPurchase(
  tx: import('@prisma/client').Prisma.TransactionClient,
  userId: string,
  items: { productId: string; quantity: number }[],
  purchasedAt: Date,
): Promise<void> {
  for (const item of items) {
    const existing = await tx.userProductStat.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: item.productId,
        },
      },
    });

    const prior = existing?.lastPurchasedAt;

    const intervalDays = prior
      ? (purchasedAt.getTime() - prior.getTime()) / 86400000
      : null;

    const purchaseCount = (existing?.purchaseCount ?? 0) + 1;
    const totalQuantity =
      (existing?.totalQuantity ?? 0) + item.quantity;

    const medianQuantity = Math.max(
      1,
      Math.round(totalQuantity / purchaseCount),
    );

    const previousMedian = existing?.medianIntervalDays;

    const medianIntervalDays =
      intervalDays == null
        ? previousMedian
        : previousMedian == null
          ? intervalDays
          : (previousMedian * (purchaseCount - 2) + intervalDays) /
            (purchaseCount - 1);

    await tx.userProductStat.upsert({
      where: {
        userId_productId: {
          userId,
          productId: item.productId,
        },
      },
      create: {
        userId,
        productId: item.productId,
        purchaseCount: 1,
        totalQuantity: item.quantity,
        lastPurchasedAt: purchasedAt,
        medianQuantity,
        medianIntervalDays,
        computedAt: purchasedAt,
      },
      update: {
        purchaseCount,
        totalQuantity,
        lastPurchasedAt: purchasedAt,
        medianQuantity,
        medianIntervalDays,
        computedAt: purchasedAt,
      },
    });
  }
}

export async function rebuildAssociations(): Promise<number> {
  const delivered = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    select: {
      items: {
        select: {
          productId: true,
        },
      },
    },
  });

  const counts = new Map<string, number>();
  const productTotals = new Map<string, number>();

  for (const order of delivered) {
    const ids = [
      ...new Set(order.items.map((item) => item.productId)),
    ];

    for (const id of ids) {
      productTotals.set(
        id,
        (productTotals.get(id) ?? 0) + 1,
      );
    }

    for (const a of ids) {
      for (const b of ids) {
        if (a !== b) {
          const key = `${a}:${b}`;
          counts.set(
            key,
            (counts.get(key) ?? 0) + 1,
          );
        }
      }
    }
  }

  const totalOrders = delivered.length || 1;

  await prisma.$transaction(async (tx) => {
    await tx.productAssociation.deleteMany();

    for (const [key, coOccurrenceCount] of counts) {
      const parts = key.split(':');

      const a = parts[0];
      const b = parts[1];

      if (!a || !b) {
        continue;
      }

      const support = coOccurrenceCount / totalOrders;

      const confidence =
        coOccurrenceCount /
        (productTotals.get(a) ?? 1);

      const baseRate =
        (productTotals.get(b) ?? 0) /
        totalOrders;

      const lift =
        baseRate > 0
          ? confidence / baseRate
          : 0;

      await tx.productAssociation.create({
        data: {
          productAId: a,
          productBId: b,
          coOccurrenceCount,
          support,
          confidence,
          lift,
        },
      });
    }
  });

  return counts.size;
}