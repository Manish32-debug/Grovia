import type { Prisma } from '@prisma/client';
import type { CartDTO, CartLineDTO, WishlistItemDTO } from '@grovia/shared';
import { prisma } from '../../config/prisma.js';
import { AppError } from '../../lib/AppError.js';

const cartItemInclude = {
  items: {
    include: {
      product: {
        include: {
          images: true,
          inventory: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

function toLineDTO(item: {
  quantity: number;
  product: {
    id: string;
    name: string;
    brand: string | null;
    unit: string;
    pricePaise: number;
    mrpPaise: number;
    isActive: boolean;
    images: { url: string; isPrimary: boolean }[];
    inventory: { stock: number; reserved: number } | null;
  };
}): CartLineDTO {
  const p = item.product;
  const primaryImage = p.images.find((i) => i.isPrimary) ?? p.images[0];
  const available = Math.max(
    (p.inventory?.stock ?? 0) - (p.inventory?.reserved ?? 0),
    0,
  );

  return {
    productId: p.id,
    name: p.name,
    brand: p.brand,
    unit: p.unit,
    image: primaryImage?.url ?? null,
    unitPricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise,
    quantity: item.quantity,
    lineTotalPaise: p.pricePaise * item.quantity,
    available,
    isActive: p.isActive,
  };
}

function toCartDTO(
  cart: {
    items: Parameters<typeof toLineDTO>[0][];
  } | null,
): CartDTO {
  const lines = (cart?.items ?? []).map(toLineDTO);

  return {
    lines,
    subtotalPaise: lines.reduce((sum, l) => sum + l.lineTotalPaise, 0),
    itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
  };
}

export async function getCart(userId: string): Promise<CartDTO> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: cartItemInclude,
  });

  return toCartDTO(cart);
}

async function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function assertProductPurchasable(productId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { isActive: true },
  });

  if (!product || !product.isActive) {
    throw AppError.notFound('Product not found.');
  }
}

/**
 * Adds to (not replaces) the existing line quantity, capped at 50 —
 * matches cartAddItemSchema / cartUpdateItemSchema's max.
 */
export async function addItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartDTO> {
  await assertProductPurchasable(productId);

  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, 50);

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity: nextQuantity },
    update: { quantity: nextQuantity },
  });

  return getCart(userId);
}

/** Sets the line to an exact quantity (used by the cart page's quantity stepper). */
export async function updateItem(
  userId: string,
  productId: string,
  quantity: number,
): Promise<CartDTO> {
  const cart = await getOrCreateCart(userId);

  const result = await prisma.cartItem.updateMany({
    where: { cartId: cart.id, productId },
    data: { quantity },
  });

  if (result.count === 0) {
    throw AppError.notFound('That item is not in your cart.');
  }

  return getCart(userId);
}

export async function removeItem(
  userId: string,
  productId: string,
): Promise<CartDTO> {
  const cart = await getOrCreateCart(userId);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id, productId },
  });

  return getCart(userId);
}

export async function clearCart(userId: string): Promise<void> {
  const cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) return;

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
}

// ─────────────────────────────── wishlist ───────────────────────────────

async function getOrCreateWishlist(userId: string) {
  return prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function listWishlist(
  userId: string,
): Promise<WishlistItemDTO[]> {
  const wishlist = await prisma.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { images: true, inventory: true } },
        },
        orderBy: { addedAt: 'desc' },
      },
    },
  });

  return (wishlist?.items ?? []).map((item) => {
    const p = item.product;
    const primaryImage = p.images.find((i) => i.isPrimary) ?? p.images[0];
    const available =
      (p.inventory?.stock ?? 0) - (p.inventory?.reserved ?? 0);

    return {
      productId: p.id,
      name: p.name,
      brand: p.brand,
      unit: p.unit,
      pricePaise: p.pricePaise,
      mrpPaise: p.mrpPaise,
      image: primaryImage?.url ?? null,
      inStock: p.isActive && available > 0,
      addedAt: item.addedAt.toISOString(),
    };
  });
}

export async function addToWishlist(
  userId: string,
  productId: string,
): Promise<void> {
  await assertProductPurchasable(productId);

  const wishlist = await getOrCreateWishlist(userId);

  await prisma.wishlistItem.upsert({
    where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
    create: { wishlistId: wishlist.id, productId },
    update: {},
  });
}

export async function removeFromWishlist(
  userId: string,
  productId: string,
): Promise<void> {
  const wishlist = await getOrCreateWishlist(userId);

  await prisma.wishlistItem.deleteMany({
    where: { wishlistId: wishlist.id, productId },
  });
}
