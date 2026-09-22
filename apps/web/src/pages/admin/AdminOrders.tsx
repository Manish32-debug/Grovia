import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
} from 'lucide-react';

import {
  adminOrders,
  transitionOrder,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

type AdminOrderItem = {
  id: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

type AdminPayment = {
  status: string;
  method: string | null;
  amountPaise: number;
  createdAt: string;
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  paymentMode: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  items: AdminOrderItem[];
  payments: AdminPayment[];
};

type AdminOrdersResponse = {
  items: AdminOrder[];
  total: number;
  totalPages: number;
};

const STATUS_OPTIONS = [
  'ALL',
  'PENDING_PAYMENT',
  'PAYMENT_FAILED',
  'EXPIRED',
  'PLACED',
  'CONFIRMED',
  'PACKING',
  'READY_FOR_PICKUP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERY_FAILED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
];

const ADMIN_TRANSITIONS: Record<
  string,
  { value: string; label: string }[]
> = {
  PLACED: [
    {
      value: 'CONFIRMED',
      label: 'Confirm order',
    },
    {
      value: 'CANCELLED',
      label: 'Cancel order',
    },
  ],

  CONFIRMED: [
    {
      value: 'PACKING',
      label: 'Start packing',
    },
    {
      value: 'CANCELLED',
      label: 'Cancel order',
    },
  ],

  PACKING: [
    {
      value: 'READY_FOR_PICKUP',
      label: 'Mark ready for pickup',
    },
    {
      value: 'CANCELLED',
      label: 'Cancel order',
    },
  ],

  READY_FOR_PICKUP: [
    {
      value: 'OUT_FOR_DELIVERY',
      label: 'Send for delivery',
    },
  ],

  OUT_FOR_DELIVERY: [
    {
      value: 'DELIVERED',
      label: 'Mark delivered',
    },
    {
      value: 'DELIVERY_FAILED',
      label: 'Mark delivery failed',
    },
  ],

  DELIVERY_FAILED: [
    {
      value: 'OUT_FOR_DELIVERY',
      label: 'Retry delivery',
    },
    {
      value: 'CANCELLED',
      label: 'Cancel order',
    },
  ],

  DELIVERED: [
    {
      value: 'RETURN_REQUESTED',
      label: 'Request return',
    },
  ],

  RETURN_REQUESTED: [
    {
      value: 'RETURNED',
      label: 'Mark returned',
    },
  ],

  RETURNED: [
    {
      value: 'REFUNDED',
      label: 'Mark refunded',
    },
  ],

  PENDING_PAYMENT: [
    {
      value: 'CANCELLED',
      label: 'Cancel order',
    },
  ],
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ');
}

function statusClass(status: string) {
  switch (status) {
    case 'DELIVERED':
    case 'CONFIRMED':
      return 'bg-emerald-50 text-emerald-700';

    case 'PACKING':
    case 'READY_FOR_PICKUP':
    case 'OUT_FOR_DELIVERY':
      return 'bg-blue-50 text-blue-700';

    case 'PENDING_PAYMENT':
      return 'bg-amber-50 text-amber-700';

    case 'PAYMENT_FAILED':
    case 'DELIVERY_FAILED':
      return 'bg-orange-50 text-orange-700';

    case 'CANCELLED':
    case 'EXPIRED':
    case 'REFUNDED':
      return 'bg-red-50 text-red-700';

    case 'RETURN_REQUESTED':
    case 'RETURNED':
      return 'bg-purple-50 text-purple-700';

    case 'PLACED':
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function paymentClass(status: string | null) {
  switch (status?.toUpperCase()) {
    case 'SUCCESS':
    case 'PAID':
    case 'COMPLETED':
      return 'text-emerald-700';

    case 'FAILED':
      return 'text-red-600';

    case 'PENDING':
    case 'CREATED':
      return 'text-amber-700';

    default:
      return 'text-text-2';
  }
}

export function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] =
    useState('ALL');

  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);

  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  const q = useQuery<AdminOrdersResponse>({
    queryKey: [
      'admin-orders',
      statusFilter,
      page,
    ],
    queryFn: () =>
      adminOrders({
        page,
        limit: 20,
        ...(statusFilter !== 'ALL'
          ? { status: statusFilter }
          : {}),
      }),
  });

  const orders = q.data?.items ?? [];

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return orders;
    }

    return orders.filter((item) => {
      return (
        item.orderNumber
          .toLowerCase()
          .includes(value) ||
        item.user.name
          .toLowerCase()
          .includes(value) ||
        item.user.email
          .toLowerCase()
          .includes(value)
      );
    });
  }, [orders, search]);

  async function handleTransition(
    order: AdminOrder,
    toStatus: string,
  ) {
    const transition = ADMIN_TRANSITIONS[
      order.status
    ]?.find(
      (item) => item.value === toStatus,
    );

    if (!transition) {
      return;
    }

    const confirmed = window.confirm(
      `${transition.label} for ${order.orderNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    const note = window.prompt(
      'Optional note for the order history:',
      '',
    );

    setUpdatingOrderId(order.id);

    try {
      await transitionOrder(
        order.id,
        toStatus,
        note?.trim() || undefined,
      );

      await q.refetch();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to update order status.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  function changeFilter(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  if (q.isPending) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Orders
          </h1>
        </div>

        <div className="rounded-card bg-surface p-8 text-text-2 shadow-card">
          Loading orders…
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Orders
          </h1>
        </div>

        <div className="rounded-card border border-red-100 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Unable to load orders.
          </p>

          <button
            type="button"
            onClick={() => void q.refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            <RefreshCw className="size-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Orders
          </h1>

          <p className="mt-1 text-text-2">
            Monitor orders, payments and fulfillment
            status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={[
              'size-4',
              q.isFetching ? 'animate-spin' : '',
            ].join(' ')}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Orders
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {q.data?.total ?? 0}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Showing
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {filteredOrders.length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Current filter
          </p>

          <p className="mt-1 truncate text-lg font-extrabold">
            {statusFilter === 'ALL'
              ? 'All orders'
              : formatStatus(statusFilter)}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Page
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {page} / {q.data?.totalPages ?? 1}
          </p>
        </div>
      </div>

      <section className="rounded-card bg-surface p-4 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search order number, customer or email…"
              className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-grove-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              changeFilter(event.target.value)
            }
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-grove-500"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL'
                  ? 'All statuses'
                  : formatStatus(status)}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="border-b border-line bg-slate-50">
              <tr className="text-xs font-bold uppercase tracking-[0.08em] text-text-3">
                <th className="px-5 py-4">
                  Order
                </th>

                <th className="px-5 py-4">
                  Customer
                </th>

                <th className="px-5 py-4">
                  Items
                </th>

                <th className="px-5 py-4">
                  Payment
                </th>

                <th className="px-5 py-4">
                  Total
                </th>

                <th className="px-5 py-4">
                  Created
                </th>

                <th className="px-5 py-4">
                  Status
                </th>

                <th className="px-5 py-4">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line">
              {filteredOrders.map((item) => {
                const payment =
                  item.payments?.[
                    item.payments.length - 1
                  ];

                const transitions =
                  ADMIN_TRANSITIONS[
                    item.status
                  ] ?? [];

                const updating =
                  updatingOrderId === item.id;

                return (
                  <tr
                    key={item.id}
                    className="align-top transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-5">
                      <p className="font-bold">
                        {item.orderNumber}
                      </p>

                      <p className="mt-1 text-xs text-text-3">
                        {item.id.slice(0, 8)}
                      </p>
                    </td>

                    <td className="px-5 py-5">
                      <p className="font-semibold">
                        {item.user.name}
                      </p>

                      <p className="mt-1 max-w-[190px] truncate text-xs text-text-3">
                        {item.user.email}
                      </p>
                    </td>

                    <td className="px-5 py-5">
                      <p className="font-semibold tabular">
                        {item.items.reduce(
                          (sum, orderItem) =>
                            sum + orderItem.quantity,
                          0,
                        )}
                      </p>

                      <p className="mt-1 text-xs text-text-3">
                        {item.items.length}{' '}
                        product
                        {item.items.length === 1
                          ? ''
                          : 's'}
                      </p>
                    </td>

                    <td className="px-5 py-5">
                      <p
                        className={[
                          'font-semibold',
                          paymentClass(
                            payment?.status ?? null,
                          ),
                        ].join(' ')}
                      >
                        {payment?.status
                          ? formatStatus(
                              payment.status,
                            )
                          : 'No payment'}
                      </p>

                      <p className="mt-1 text-xs text-text-3">
                        {payment?.method
                          ? formatStatus(
                              payment.method,
                            )
                          : item.paymentMode
                            ? formatStatus(
                                item.paymentMode,
                              )
                            : '—'}
                      </p>
                    </td>

                    <td className="px-5 py-5">
                      <p className="font-bold tabular">
                        {formatMoney(
                          item.totalPaise,
                        )}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-5 py-5 text-sm text-text-2">
                      {formatDate(
                        item.createdAt,
                      )}
                    </td>

                    <td className="px-5 py-5">
                      <span
                        className={[
                          'inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold',
                          statusClass(
                            item.status,
                          ),
                        ].join(' ')}
                      >
                        {formatStatus(
                          item.status,
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-5">
                      {transitions.length > 0 ? (
                        <select
                          value=""
                          disabled={updating}
                          onChange={(event) => {
                            const value =
                              event.target.value;

                            if (!value) {
                              return;
                            }

                            void handleTransition(
                              item,
                              value,
                            );
                          }}
                          className="min-w-[175px] rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-grove-500 disabled:opacity-50"
                        >
                          <option value="">
                            {updating
                              ? 'Updating…'
                              : 'Change status'}
                          </option>

                          {transitions.map(
                            (transition) => (
                              <option
                                key={
                                  transition.value
                                }
                                value={
                                  transition.value
                                }
                              >
                                {transition.label}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <span className="text-xs text-text-3">
                          No admin action
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line lg:hidden">
          {filteredOrders.map((item) => {
            const payment =
              item.payments?.[
                item.payments.length - 1
              ];

            const transitions =
              ADMIN_TRANSITIONS[item.status] ?? [];

            const updating =
              updatingOrderId === item.id;

            const quantity = item.items.reduce(
              (sum, orderItem) =>
                sum + orderItem.quantity,
              0,
            );

            return (
              <article
                key={item.id}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {item.orderNumber}
                    </p>

                    <p className="mt-1 text-sm text-text-2">
                      {item.user.name}
                    </p>

                    <p className="text-xs text-text-3">
                      {item.user.email}
                    </p>
                  </div>

                  <span
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-bold',
                      statusClass(item.status),
                    ].join(' ')}
                  >
                    {formatStatus(
                      item.status,
                    )}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
                  <div>
                    <p className="text-xs text-text-3">
                      Total
                    </p>

                    <p className="mt-1 font-bold tabular">
                      {formatMoney(
                        item.totalPaise,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-3">
                      Items
                    </p>

                    <p className="mt-1 font-bold tabular">
                      {quantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-3">
                      Payment
                    </p>

                    <p
                      className={[
                        'mt-1 font-semibold',
                        paymentClass(
                          payment?.status ??
                            null,
                        ),
                      ].join(' ')}
                    >
                      {payment?.status
                        ? formatStatus(
                            payment.status,
                          )
                        : 'No payment'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-3">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {formatDate(
                        item.createdAt,
                      )}
                    </p>
                  </div>
                </div>

                {transitions.length > 0 && (
                  <div className="mt-4">
                    <select
                      value=""
                      disabled={updating}
                      onChange={(event) => {
                        const value =
                          event.target.value;

                        if (!value) {
                          return;
                        }

                        void handleTransition(
                          item,
                          value,
                        );
                      }}
                      className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-grove-500 disabled:opacity-50"
                    >
                      <option value="">
                        {updating
                          ? 'Updating…'
                          : 'Change order status'}
                      </option>

                      {transitions.map(
                        (transition) => (
                          <option
                            key={
                              transition.value
                            }
                            value={
                              transition.value
                            }
                          >
                            {transition.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-semibold">
              No orders found.
            </p>

            <p className="mt-1 text-sm text-text-3">
              Try changing the status filter or
              search term.
            </p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between rounded-card bg-surface p-4 shadow-card">
        <p className="text-sm text-text-2">
          Page {page} of{' '}
          {q.data?.totalPages ?? 1}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={
              page <= 1 || q.isFetching
            }
            onClick={() =>
              setPage((current) =>
                Math.max(current - 1, 1),
              )
            }
            className="flex size-10 items-center justify-center rounded-full border border-line bg-white transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-5" />
          </button>

          <button
            type="button"
            disabled={
              page >=
                (q.data?.totalPages ?? 1) ||
              q.isFetching
            }
            onClick={() =>
              setPage((current) =>
                Math.min(
                  current + 1,
                  q.data?.totalPages ?? 1,
                ),
              )
            }
            className="flex size-10 items-center justify-center rounded-full border border-line bg-white transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}