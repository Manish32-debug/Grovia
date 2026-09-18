import { ErrorCode, OrderStatus, Role } from '@grovia/shared';
import { AppError } from '../../lib/AppError.js';

/**
 * Allowed toStatus values per fromStatus, each gated to the roles allowed to
 * make that move. This is the ONLY place order transitions are decided —
 * order.service.ts calls assertTransitionAllowed before every status write.
 *
 * Happy path: PLACED → CONFIRMED → PACKING → READY_FOR_PICKUP →
 *             OUT_FOR_DELIVERY → DELIVERED
 *
 * PENDING_PAYMENT and CANCELLED are reachable outside that path
 * (payment gateway / stale-order worker / cancellation), never skipped into it.
 */
const TRANSITIONS: Partial<
  Record<OrderStatus, Partial<Record<OrderStatus, Role[]>>>
> = {
  [OrderStatus.PENDING_PAYMENT]: {
    [OrderStatus.PLACED]: [], // system-only (payment webhook)
    [OrderStatus.PAYMENT_FAILED]: [], // system-only (payment gateway)
    [OrderStatus.EXPIRED]: [], // system-only (stale-order worker)
    [OrderStatus.CANCELLED]: [Role.CUSTOMER, Role.ADMIN],
  },

  [OrderStatus.PLACED]: {
    [OrderStatus.CONFIRMED]: [Role.ADMIN],
    [OrderStatus.CANCELLED]: [Role.CUSTOMER, Role.ADMIN],
  },

  [OrderStatus.CONFIRMED]: {
    [OrderStatus.PACKING]: [Role.ADMIN],
    [OrderStatus.CANCELLED]: [Role.ADMIN],
  },

  [OrderStatus.PACKING]: {
    [OrderStatus.READY_FOR_PICKUP]: [Role.ADMIN],
    [OrderStatus.CANCELLED]: [Role.ADMIN],
  },

  [OrderStatus.READY_FOR_PICKUP]: {
    [OrderStatus.OUT_FOR_DELIVERY]: [Role.ADMIN, Role.DELIVERY_PARTNER],
  },

  [OrderStatus.OUT_FOR_DELIVERY]: {
    [OrderStatus.DELIVERED]: [Role.DELIVERY_PARTNER, Role.ADMIN],
    [OrderStatus.DELIVERY_FAILED]: [Role.DELIVERY_PARTNER, Role.ADMIN],
  },

  [OrderStatus.DELIVERY_FAILED]: {
    [OrderStatus.OUT_FOR_DELIVERY]: [Role.ADMIN],
    [OrderStatus.CANCELLED]: [Role.ADMIN],
  },

  [OrderStatus.DELIVERED]: {
    [OrderStatus.RETURN_REQUESTED]: [Role.CUSTOMER, Role.ADMIN],
  },

  [OrderStatus.RETURN_REQUESTED]: {
    [OrderStatus.RETURNED]: [Role.ADMIN],
  },

  [OrderStatus.RETURNED]: {
    [OrderStatus.REFUNDED]: [Role.ADMIN],
  },
};

/**
 * System transitions (payment webhook, stale-order worker) bypass role checks.
 *
 * Every transition still has to exist in TRANSITIONS; the system cannot invent
 * an arbitrary status jump.
 */
export function assertSystemTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
): void {
  const allowed = TRANSITIONS[from];

  if (!allowed || !Object.prototype.hasOwnProperty.call(allowed, to)) {
    throw new AppError(
      409,
      ErrorCode.INVALID_TRANSITION,
      `Cannot move an order from ${from} to ${to}.`,
    );
  }
}

/**
 * Validate a user-initiated transition against both the transition graph and
 * the role(s) permitted to perform it.
 */
export function assertTransitionAllowed(
  from: OrderStatus,
  to: OrderStatus,
  role: Role,
): void {
  const allowed = TRANSITIONS[from]?.[to];

  if (!allowed) {
    throw new AppError(
      409,
      ErrorCode.INVALID_TRANSITION,
      `Cannot move an order from ${from} to ${to}.`,
    );
  }

  // An empty role list explicitly marks the transition as system-only.
  if (allowed.length === 0) {
    throw new AppError(
      409,
      ErrorCode.INVALID_TRANSITION,
      'This transition can only be made by the system.',
    );
  }

  if (!allowed.includes(role)) {
    throw AppError.forbidden('You cannot make this order status change.');
  }
}
