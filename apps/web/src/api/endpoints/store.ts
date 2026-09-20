import { del, get, patch, post } from '@/api/client';

export type Product = {
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
  inStock: boolean;
  description?: string | null;
  tags?: string[];
  nutrition?: Record<string, unknown> | null;
  images?: {
    url: string;
    alt: string;
    isPrimary: boolean;
  }[];
  category?: {
    id: string;
    name: string;
    slug: string;
    iconUrl: string | null;
    displayOrder: number;
  };
  sellableQty?: number;
};

export type Cart = {
  lines: Array<
    Product & {
      productId: string;
      quantity: number;
      lineTotalPaise: number;
      available: number;
      isActive: boolean;
      unitPricePaise: number;
      mrpPaise: number;
      image: string | null;
    }
  >;
  subtotalPaise: number;
  itemCount: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  items: Array<{
    productId: string;
    name: string;
    brand: string | null;
    unit: string;
    image: string | null;
    unitPricePaise: number;
    quantity: number;
    lineTotalPaise: number;
  }>;
  address: Record<string, unknown>;
  slot: {
    date: string;
    startMinute: number;
    endMinute: number;
  } | null;
  subtotalPaise: number;
  discountPaise: number;
  deliveryFeePaise: number;
  taxPaise: number;
  totalPaise: number;
  paymentMode: string;
  paymentStatus: string | null;
  history: Array<{
    status: string;
    note: string | null;
    createdAt: string;
  }>;
  createdAt: string;
  canCancel: boolean;
  canReview: boolean;
};

export const listProducts = (params: Record<string, unknown>) =>
  get<{
    items: Product[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>('/products', params);

export const listCategories = () =>
  get<
    Array<{
      id: string;
      name: string;
      slug: string;
      iconUrl: string | null;
      displayOrder: number;
    }>
  >('/categories');

export const productBySlug = (slug: string) =>
  get<Product>(`/products/${slug}`);

export const cart = () => get<Cart>('/cart');

export const addCart = (productId: string, quantity: number) =>
  post<Cart>('/cart/items', {
    productId,
    quantity,
  });

export const updateCart = (productId: string, quantity: number) =>
  patch<Cart>(`/cart/items/${productId}`, {
    quantity,
  });

export const removeCart = (productId: string) =>
  del(`/cart/items/${productId}`);

export const clearCart = () => del('/cart');

export type WishlistItem = {
  productId: string;
  name: string;
  brand: string | null;
  unit: string;
  pricePaise: number;
  mrpPaise: number;
  image: string | null;
  inStock: boolean;
  addedAt: string;
};

export const wishlist = () => get<WishlistItem[]>('/wishlist');

export const addWishlist = (productId: string) =>
  post(`/wishlist/${productId}`);

export const removeWishlist = (productId: string) =>
  del(`/wishlist/${productId}`);

export const addresses = () => get<any[]>('/addresses');

export const slots = (date?: string) =>
  get<any[]>('/slots', date ? { date } : undefined);

export const checkout = (body: unknown) =>
  post<any>('/orders/checkout', body);

export const orders = (params?: Record<string, unknown>) =>
  get<{
    items: Order[];
    total: number;
    totalPages: number;
  }>('/orders', params);

export const order = (id: string) =>
  get<Order>(`/orders/${id}`);

export const cancelOrder = (id: string, reason: string) =>
  post(`/orders/${id}/cancel`, {
    reason,
  });

export const reorder = (id: string) =>
  post<{
    addedCount: number;
    skipped: string[];
  }>(`/orders/${id}/reorder`);

export const paymentStatus = (
  orderId: string,
  paymentId?: string,
) =>
  get<{
    orderStatus: string;
    paymentStatus: string | null;
  }>(
    `/orders/${orderId}/payment-status`,
    paymentId ? { paymentId } : undefined,
  );

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  orderId: string | null;
  readAt: string | null;
  createdAt: string;
};

export const notifications = () =>
  get<{
    items: NotificationItem[];
    total: number;
    totalPages: number;
    unreadCount: number;
  }>('/notifications', {
    page: 1,
    limit: 30,
  });

export const markAllNotificationsRead = () =>
  post('/notifications/read-all');

export const smartBasket = () =>
  get<any[]>('/intelligence/smart-basket');

export const recommendations = (productId?: string) =>
  get<any[]>(
    '/intelligence/recommendations',
    productId ? { productId } : undefined,
  );

export const reviews = (productId: string) =>
  get<any>('/reviews', {
    productId,
    page: 1,
    limit: 20,
  });

export const createReview = (body: unknown) =>
  post('/reviews', body);

export const adminDashboard = () =>
  get<any>('/admin/dashboard');

export const adminProducts = (
  params?: Record<string, unknown>,
) =>
  get<any>('/admin/products', params);

export const adminOrders = (
  params?: Record<string, unknown>,
) =>
  get<any>('/admin/orders', params);

export const adjustInventory = (
  productId: string,
  delta: number,
  note?: string,
) =>
  post(`/admin/products/${productId}/inventory`, {
    delta,
    note,
  });

export const deliveryAssignments = () =>
  get<any[]>('/delivery');

export const acceptAssignment = (id: string) =>
  post(`/delivery/${id}/accept`);

export const pickupAssignment = (id: string) =>
  post(`/delivery/${id}/pickup`);

export const completeAssignment = (id: string) =>
  post(`/delivery/${id}/complete`);

export const failAssignment = (
  id: string,
  note: string,
) =>
  post(`/delivery/${id}/fail`, {
    note,
  });