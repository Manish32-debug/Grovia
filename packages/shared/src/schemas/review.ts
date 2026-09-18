import { z } from 'zod';

export const reviewWriteSchema = z.object({
  productId: z.string().uuid('Invalid product ID.'),
  orderId: z.string().uuid('Invalid order ID.'),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().max(2000).optional(),
});
export type ReviewWriteInput = z.infer<typeof reviewWriteSchema>;

export const reviewListQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;

export const reviewIdParamsSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID.'),
});

export const reviewModerationSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
});

export interface ReviewDTO {
  id: string;
  productId: string;
  orderId: string;
  userName: string;
  rating: number;
  title: string | null;
  body: string | null;
  isVerifiedPurchase: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
