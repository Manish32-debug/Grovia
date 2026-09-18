import { z } from 'zod';

/**
 * Validation schema for adding a product to the cart.
 *
 * quantity is intentionally capped at 50 per product to prevent
 * unreasonable cart quantities and align with the existing cart rules.
 */
export const cartAddItemSchema = z.object({
  productId: z.string().uuid('Invalid product ID.'),
  quantity: z
    .number()
    .int('Quantity must be a whole number.')
    .positive('Quantity must be greater than 0.')
    .max(50, 'Quantity cannot exceed 50.')
    .default(1),
});

/**
 * Validation schema for changing the quantity of an existing cart item.
 */
export const cartUpdateItemSchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be a whole number.')
    .positive('Quantity must be greater than 0.')
    .max(50, 'Quantity cannot exceed 50.'),
});

/**
 * Route parameter validation for product-specific cart/wishlist operations.
 */
export const productIdParamsSchema = z.object({
  productId: z.string().uuid('Invalid product ID.'),
});

export interface CartLineDTO {
  productId: string;
  name: string;
  brand: string | null;
  unit: string;
  image: string | null;
  unitPricePaise: number;
  mrpPaise: number;
  quantity: number;
  lineTotalPaise: number;

  /** Sellable stock available right now: stock - reserved. */
  available: number;

  /** Whether the product is currently active in the catalog. */
  isActive: boolean;
}

export interface CartDTO {
  lines: CartLineDTO[];
  subtotalPaise: number;
  itemCount: number;
}

export interface WishlistItemDTO {
  productId: string;
  name: string;
  brand: string | null;
  unit: string;
  pricePaise: number;
  mrpPaise: number;
  image: string | null;
  inStock: boolean;
  addedAt: string;
}
