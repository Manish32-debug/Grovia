import { createHmac, randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { safeEqual } from '../../lib/crypto.js';

const BASE_URL =
  env.CASHFREE_ENV === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

const API_VERSION = env.CASHFREE_API_VERSION || '2025-01-01';

export const isCashfreeConfigured = Boolean(
  env.CASHFREE_APP_ID &&
    env.CASHFREE_SECRET_KEY,
);

if (!isCashfreeConfigured) {
  logger.warn(
    'Cashfree credentials are not configured. ' +
      'Online payments are unavailable until CASHFREE_APP_ID and CASHFREE_SECRET_KEY are provided.',
  );
}

function requireCashfree(): void {
  if (!isCashfreeConfigured) {
    throw new Error(
      'Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.',
    );
  }
}

type CashfreeFetchInit = {
  method: 'GET' | 'POST';
  body?: string;
};

type CashfreeResponse = {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
};

async function cfFetch<T>(
  path: string,
  init: CashfreeFetchInit,
  options: {
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  requireCashfree();

  const requestId = randomUUID();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-client-id': env.CASHFREE_APP_ID!,
    'x-client-secret': env.CASHFREE_SECRET_KEY!,
    'x-api-version': API_VERSION,
    'x-request-id': requestId,
  };

  if (options.idempotencyKey) {
    headers['x-idempotency-key'] = options.idempotencyKey;
  }

  const res = (await globalThis.fetch(`${BASE_URL}${path}`, {
    method: init.method,
    body: init.body,
    headers,
  })) as unknown as CashfreeResponse;

  const body = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    type?: string;
    code?: string;
  };

  if (!res.ok) {
    throw new Error(
      `Cashfree ${path} failed (${res.status}): ${
        body?.message ??
        body?.type ??
        body?.code ??
        'unknown error'
      }`,
    );
  }

  return body;
}

/* -------------------------------------------------------------------------- */
/* CREATE ORDER                                                               */
/* -------------------------------------------------------------------------- */

export interface CreateOrderInput {
  orderId: string;
  orderAmountRupees: number;
  customerId: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface CreateOrderResult {
  cfOrderId: string;
  orderId: string;
  paymentSessionId: string;
  mock: false;
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  requireCashfree();

  const idempotencyKey = randomUUID();

  const body = await cfFetch<{
    cf_order_id: string;
    order_id: string;
    payment_session_id: string;
  }>(
    '/orders',
    {
      method: 'POST',
      body: JSON.stringify({
        order_id: input.orderId,
        order_amount: Number(input.orderAmountRupees.toFixed(2)),
        order_currency: 'INR',

        customer_details: {
          customer_id: input.customerId,
          customer_email: input.customerEmail,
          customer_phone: input.customerPhone,
        },

        order_meta: {
          return_url: input.returnUrl,
          notify_url: input.notifyUrl,
        },
      }),
    },
    { idempotencyKey },
  );

  return {
    cfOrderId: body.cf_order_id,
    orderId: body.order_id,
    paymentSessionId: body.payment_session_id,
    mock: false,
  };
}

/* -------------------------------------------------------------------------- */
/* UPI QR                                                                     */
/* -------------------------------------------------------------------------- */

export interface UpiQrResult {
  payload: string;
  redirectUrl: string | null;
  mock: false;
}

/**
 * Initiates a real Cashfree UPI QR payment session.
 *
 * IMPORTANT:
 * The backend never generates a fake QR image.
 * The frontend should use Cashfree.js `upiQr` for rendering the QR
 * using the real payment session.
 */
export async function createUpiQr(
  paymentSessionId: string,
): Promise<UpiQrResult> {
  requireCashfree();

  const body = await cfFetch<{
    payment_method?: string;
    channel?: string;
    action?: string;
    cf_payment_id?: string | number;
    data?: {
      url?: string;
      payload?: Record<string, unknown> | string;
    };
  }>(
    '/orders/sessions',
    {
      method: 'POST',
      body: JSON.stringify({
        payment_session_id: paymentSessionId,
        payment_method: {
          upi: {
            channel: 'qrcode',
          },
        },
      }),
    },
    {
      idempotencyKey: randomUUID(),
    },
  );

  const payload =
    typeof body.data?.payload === 'string'
      ? body.data.payload
      : body.data?.payload
        ? JSON.stringify(body.data.payload)
        : '';

  return {
    payload,
    redirectUrl: body.data?.url ?? null,
    mock: false,
  };
}

/* -------------------------------------------------------------------------- */
/* PAYMENT STATUS                                                             */
/* -------------------------------------------------------------------------- */

export interface OrderStatusResult {
  status:
    | 'ACTIVE'
    | 'PAID'
    | 'EXPIRED'
    | 'TERMINATED'
    | 'TERMINATION_REQUESTED';

  paymentStatus:
    | 'SUCCESS'
    | 'FAILED'
    | 'PENDING'
    | 'CANCELLED'
    | null;

  cfPaymentId: string | null;
}

export async function fetchOrderStatus(
  gatewayOrderId: string,
): Promise<OrderStatusResult> {
  requireCashfree();

  const body = await cfFetch<{
    order_status: string;
    payments?: Array<{
      cf_payment_id: string | number;
      payment_status: string;
    }>;
  }>(`/orders/${encodeURIComponent(gatewayOrderId)}`, {
    method: 'GET',
  });

  const latest = body.payments?.[0];

  return {
    status: body.order_status as OrderStatusResult['status'],

    paymentStatus:
      (latest?.payment_status as OrderStatusResult['paymentStatus']) ??
      null,

    cfPaymentId:
      latest?.cf_payment_id != null
        ? String(latest.cf_payment_id)
        : null,
  };
}

/* -------------------------------------------------------------------------- */
/* REFUNDS                                                                    */
/* -------------------------------------------------------------------------- */

export interface RefundResult {
  gatewayRefundId: string;
  mock: false;
}

export async function createRefund(
  gatewayOrderId: string,
  amountPaise: number,
  reason: string,
): Promise<RefundResult> {
  requireCashfree();

  if (amountPaise <= 0) {
    throw new Error('Refund amount must be greater than zero.');
  }

  const refundId = `rfnd_${randomUUID()}`;

  const body = await cfFetch<{
    refund_id: string;
  }>(
    `/orders/${encodeURIComponent(gatewayOrderId)}/refunds`,
    {
      method: 'POST',
      body: JSON.stringify({
        refund_amount: Number((amountPaise / 100).toFixed(2)),
        refund_id: refundId,
        refund_note: reason.slice(0, 200),
      }),
    },
    {
      idempotencyKey: randomUUID(),
    },
  );

  return {
    gatewayRefundId: body.refund_id,
    mock: false,
  };
}

/* -------------------------------------------------------------------------- */
/* WEBHOOK SIGNATURE                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Cashfree webhook verification:
 *
 * signature = Base64(
 *   HMAC-SHA256(
 *     timestamp + rawRequestBody,
 *     CASHFREE_SECRET_KEY
 *   )
 * )
 *
 * The raw request body MUST be preserved by Express.
 */
export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  if (!env.CASHFREE_SECRET_KEY) {
    logger.error(
      'Cashfree webhook received but CASHFREE_SECRET_KEY is not configured.',
    );

    return false;
  }

  if (!timestamp || !signature || !rawBody) {
    return false;
  }

  const expected = createHmac(
    'sha256',
    env.CASHFREE_SECRET_KEY,
  )
    .update(timestamp + rawBody)
    .digest('base64');

  return safeEqual(expected, signature);
}