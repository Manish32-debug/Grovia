import { z } from 'zod';

export const adminProductIdParamsSchema = z.object({ productId: z.string().uuid() });
export const adminCategoryIdParamsSchema = z.object({ categoryId: z.string().uuid() });
export const adminInventoryAdjustSchema = z.object({
  delta: z.number().int().refine((v) => v !== 0, 'Delta cannot be zero.'),
  note: z.string().trim().max(300).optional(),
});
export const adminOrderListQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().max(1000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export const adminDeliveryAssignmentSchema = z.object({ orderId: z.string().uuid(), partnerId: z.string().uuid() });
