export type ApiSuccess<T> = { data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  error: { code: ErrorCode; message: string; details?: unknown; requestId?: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Stable machine-readable codes. The frontend maps these to user-facing copy. */
export const ErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
  // domain codes arrive from phase 5 onward
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  COUPON_INVALID: 'COUPON_INVALID',
  SLOT_FULL: 'SLOT_FULL',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  WEBHOOK_INVALID: 'WEBHOOK_INVALID',
  // auth
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
