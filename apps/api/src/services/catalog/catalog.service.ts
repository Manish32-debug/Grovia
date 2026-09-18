import { Prisma } from '@prisma/client';
import type {
  CategoryDTO,
  PaginatedDTO,
  ProductDetailDTO,
  ProductListItemDTO,
  ProductListQuery,
} from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';

// ─────────────────────────────── categories ───────────────────────────────

export async function listCategories(): Promise<CategoryDTO[]> {
  const rows = await prisma.category.findMany({
    where: {
      isActive: true,
      products: {
        some: {
          isActive: true,
        },
      },
    },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
  });

  return rows.map(toCategoryDTO);
}

function toCategoryDTO(c: {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  displayOrder: number;
}): CategoryDTO {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    iconUrl: c.iconUrl,
    displayOrder: c.displayOrder,
  };
}

// ─────────────────────────────── products ───────────────────────────────

const productWithRelations = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    category: true,
    images: { orderBy: { displayOrder: 'asc' } },
    inventory: true,
  },
});

type ProductWithRelations =
  Prisma.ProductGetPayload<typeof productWithRelations>;

function toListItemDTO(p: ProductWithRelations): ProductListItemDTO {
  const primary = p.images.find((i) => i.isPrimary) ?? p.images[0];
  const sellable =
    (p.inventory?.stock ?? 0) - (p.inventory?.reserved ?? 0);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    brand: p.brand,
    unit: p.unit,
    mrpPaise: p.mrpPaise,
    pricePaise: p.pricePaise,
    discountPercent: p.discountPercent,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    primaryImageUrl: primary?.url ?? null,
    categorySlug: p.category.slug,
    inStock: sellable > 0,
  };
}

function toDetailDTO(p: ProductWithRelations): ProductDetailDTO {
  const sellable =
    (p.inventory?.stock ?? 0) - (p.inventory?.reserved ?? 0);

  return {
    ...toListItemDTO(p),
    description: p.description,
    tags: p.tags,
    nutrition: (p.nutrition as Record<string, unknown> | null) ?? null,
    images: p.images.map((i) => ({
      url: i.url,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })),
    category: toCategoryDTO(p.category),
    sellableQty: Math.max(sellable, 0),
  };
}

/**
 * Full-text search (weighted, ranked) with a trigram fallback for typos.
 * Returns product ids in relevance order; empty query means "no fts filter".
 *
 * word_similarity threshold of 0.42 is calibrated against the seed catalog
 * (see prisma/sql/init-extras.sql) — it catches "panner" -> "Paneer" without
 * pulling in unrelated noise.
 */
async function searchProductIds(
  q: string,
  limit = 500,
): Promise<string[]> {
  const ftsRows = await prisma.$queryRaw<
    Array<{ id: string; rank: number }>
  >`
    SELECT "id", ts_rank("searchVector", websearch_to_tsquery('english', ${q})) AS rank
    FROM "Product"
    WHERE "isActive" = true
      AND "searchVector" @@ websearch_to_tsquery('english', ${q})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;

  if (ftsRows.length > 0) return ftsRows.map((r) => r.id);

  const trgmRows = await prisma.$queryRaw<
    Array<{ id: string; sim: number }>
  >`
    SELECT "id", GREATEST(
      word_similarity(${q}, "name"),
      word_similarity(${q}, coalesce("brand", ''))
    ) AS sim
    FROM "Product"
    WHERE "isActive" = true
      AND GREATEST(
        word_similarity(${q}, "name"),
        word_similarity(${q}, coalesce("brand", ''))
      ) >= 0.42
    ORDER BY sim DESC
    LIMIT ${limit}
  `;

  return trgmRows.map((r) => r.id);
}

export async function listProducts(
  query: ProductListQuery,
): Promise<PaginatedDTO<ProductListItemDTO>> {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
  };

  if (query.category) {
    where.category = {
      slug: query.category,
      isActive: true,
    };
  }

  if (
    query.minPrice !== undefined ||
    query.maxPrice !== undefined
  ) {
    where.pricePaise = {
      ...(query.minPrice !== undefined
        ? { gte: query.minPrice }
        : {}),
      ...(query.maxPrice !== undefined
        ? { lte: query.maxPrice }
        : {}),
    };
  }

  if (query.tags && query.tags.length > 0) {
    where.tags = { hasSome: query.tags };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput[] = [
    { createdAt: 'desc' },
  ];

  if (query.sort === 'price_asc') {
    orderBy = [{ pricePaise: 'asc' }];
  }

  if (query.sort === 'price_desc') {
    orderBy = [{ pricePaise: 'desc' }];
  }

  if (query.sort === 'rating') {
    orderBy = [
      { ratingAvg: 'desc' },
      { ratingCount: 'desc' },
    ];
  }

  if (query.sort === 'newest') {
    orderBy = [{ createdAt: 'desc' }];
  }

  let rankedIds: string[] | null = null;

  if (query.q) {
    rankedIds = await searchProductIds(query.q);

    if (rankedIds.length === 0) {
      return {
        items: [],
        page: query.page,
        pageSize: query.pageSize,
        total: 0,
        totalPages: 0,
      };
    }

    where.id = { in: rankedIds };
  }

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(
    Math.ceil(total / query.pageSize),
    1,
  );

  const skip = (query.page - 1) * query.pageSize;

  const rows = await prisma.product.findMany({
    where,
    include: productWithRelations.include,
    orderBy:
      query.q && query.sort === 'relevance'
        ? undefined
        : orderBy,
    skip:
      query.q && query.sort === 'relevance'
        ? 0
        : skip,
    take:
      query.q && query.sort === 'relevance'
        ? undefined
        : query.pageSize,
  });

  let items = rows.map(toListItemDTO);

  if (
    query.q &&
    query.sort === 'relevance' &&
    rankedIds
  ) {
    const order = new Map(
      rankedIds.map((id, i) => [id, i]),
    );

    items = items
      .slice()
      .sort(
        (a, b) =>
          (order.get(a.id) ?? 0) -
          (order.get(b.id) ?? 0),
      )
      .slice(skip, skip + query.pageSize);
  }

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages,
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetailDTO> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      isActive: true,
    },
    include: productWithRelations.include,
  });

  if (!product) {
    throw AppError.notFound('Product not found.');
  }

  return toDetailDTO(product);
}

export async function suggest(
  q: string,
  limit: number,
): Promise<string[]> {
  const ids = await searchProductIds(q, limit);

  if (ids.length === 0) return [];

  const rows = await prisma.product.findMany({
    where: {
      id: { in: ids },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const byId = new Map(
    rows.map((r) => [r.id, r.name]),
  );

  return ids
    .map((id) => byId.get(id))
    .filter(
      (n): n is string => Boolean(n),
    )
    .slice(0, limit);
}