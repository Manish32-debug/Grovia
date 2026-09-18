import { z } from 'zod';

// ─────────────────────────────── DTOs ───────────────────────────────

export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  displayOrder: number;
}

export interface ProductImageDTO {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface ProductListItemDTO {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  unit: string;
  mrpPaise: number;
  pricePaise: number;
  discountPercent: number;
  ratingAvg: number;
  ratingCount: number;
  primaryImageUrl: string | null;
  categorySlug: string;
  /** Sellable = stock - reserved. Never the raw stock column. */
  inStock: boolean;
}

export interface ProductDetailDTO extends ProductListItemDTO {
  description: string | null;
  tags: string[];
  nutrition: Record<string, unknown> | null;
  images: ProductImageDTO[];
  category: CategoryDTO;
  sellableQty: number;
}

export interface PaginatedDTO<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─────────────────────────────── query schemas ───────────────────────────────

export const productListQuerySchema = z.object({
  category: z.string().trim().min(1).max(120).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  tags: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .transform((v) => (v ? v.split(',').map((t) => t.trim()).filter(Boolean) : undefined)),
  sort: z
    .enum(['relevance', 'price_asc', 'price_desc', 'rating', 'newest'])
    .optional()
    .default('relevance'),
  page: z.coerce.number().int().positive().max(1000).optional().default(1),
  pageSize: z.coerce.number().int().positive().max(60).optional().default(24),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(160),
});

export const searchSuggestQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().positive().max(10).optional().default(6),
});

// admin catalog writes reuse these too (kept here so both sides share the rules)
export const productWriteSchema = z.object({
  name: z.string().trim().min(2).max(200),
  brand: z.string().trim().max(120).optional(),
  description: z.string().trim().max(4000).optional(),
  categoryId: z.string().uuid(),
  unit: z.string().trim().min(1).max(40),
  mrpPaise: z.number().int().positive(),
  discountPercent: z.number().int().min(0).max(90).default(0),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  nutrition: z.record(z.unknown()).optional(),
  isActive: z.boolean().default(true),
});
export type ProductWriteInput = z.infer<typeof productWriteSchema>;

export const categoryWriteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens.'),
  iconUrl: z.string().trim().url().optional(),
  gstBasis: z.number().int().min(0).max(2800).default(0),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export type CategoryWriteInput = z.infer<typeof categoryWriteSchema>;
