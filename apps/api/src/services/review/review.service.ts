import type { Prisma } from '@prisma/client';
import type { ReviewDTO, ReviewListQuery, ReviewWriteInput } from '@grovia/shared';
import { ReviewStatus, OrderStatus } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';

type ReviewWithUser = Prisma.ReviewGetPayload<{ include: { user: true } }>;

function toDTO(review: ReviewWithUser): ReviewDTO {
  return {
    id: review.id,
    productId: review.productId,
    orderId: review.orderId,
    userName: review.user.name,
    rating: review.rating,
    title: review.title,
    body: review.body,
    isVerifiedPurchase: review.isVerifiedPurchase,
    status: review.status as ReviewDTO['status'],
    createdAt: review.createdAt.toISOString(),
  };
}

export async function createReview(userId: string, input: ReviewWriteInput): Promise<ReviewDTO> {
  const order = await prisma.order.findFirst({
    where: {
      id: input.orderId,
      userId,
      status: OrderStatus.DELIVERED,
      items: { some: { productId: input.productId } },
    },
  });
  if (!order) throw AppError.conflict('CONFLICT', 'You can review a product only after it has been delivered.');

  const existing = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId: input.productId } },
  });
  if (existing) throw AppError.conflict('CONFLICT', 'You have already reviewed this product.');

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        userId,
        productId: input.productId,
        orderId: input.orderId,
        rating: input.rating,
        title: input.title || null,
        body: input.body || null,
        isVerifiedPurchase: true,
        status: ReviewStatus.APPROVED,
      },
      include: { user: true },
    });

    const aggregate = await tx.review.aggregate({
      where: { productId: input.productId, status: ReviewStatus.APPROVED },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.product.update({
      where: { id: input.productId },
      data: {
        ratingAvg: aggregate._avg.rating ?? 0,
        ratingCount: aggregate._count._all,
      },
    });
    return created;
  });
  return toDTO(review);
}

export async function listProductReviews(productId: string, page: number, limit: number) {
  const where = { productId, status: ReviewStatus.APPROVED };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.review.count({ where }),
  ]);
  return { items: rows.map(toDTO), total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}

export async function listAdminReviews(query: ReviewListQuery) {
  const where: Prisma.ReviewWhereInput = {
    ...(query.productId ? { productId: query.productId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({ where, include: { user: true }, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
    prisma.review.count({ where }),
  ]);
  return { items: rows.map(toDTO), total, totalPages: Math.max(Math.ceil(total / query.limit), 1) };
}

export async function moderateReview(reviewId: string, status: 'APPROVED' | 'REJECTED'): Promise<ReviewDTO> {
  const review = await prisma.$transaction(async (tx) => {
    const current = await tx.review.findUniqueOrThrow({ where: { id: reviewId } });
    const updated = await tx.review.update({ where: { id: reviewId }, data: { status }, include: { user: true } });
    if (current.status !== ReviewStatus.APPROVED && status === ReviewStatus.APPROVED) {
      const aggregate = await tx.review.aggregate({ where: { productId: current.productId, status: ReviewStatus.APPROVED }, _avg: { rating: true }, _count: { _all: true } });
      await tx.product.update({ where: { id: current.productId }, data: { ratingAvg: aggregate._avg.rating ?? 0, ratingCount: aggregate._count._all } });
    } else if (current.status === ReviewStatus.APPROVED && status !== ReviewStatus.APPROVED) {
      const aggregate = await tx.review.aggregate({ where: { productId: current.productId, status: ReviewStatus.APPROVED }, _avg: { rating: true }, _count: { _all: true } });
      await tx.product.update({ where: { id: current.productId }, data: { ratingAvg: aggregate._avg.rating ?? 0, ratingCount: aggregate._count._all } });
    }
    return updated;
  });
  return toDTO(review);
}
