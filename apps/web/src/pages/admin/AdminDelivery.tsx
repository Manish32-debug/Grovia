import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  CheckCircle2,
  RefreshCw,
  Truck,
  UserRound,
} from 'lucide-react';

import {
  adminDeliveryPartners,
  adminOrders,
  assignAdminDelivery,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

type Partner = {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    isActive: boolean;
  };
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
};

export function AdminDeliveryPage() {
  const qc = useQueryClient();

  const [selectedPartner, setSelectedPartner] =
    useState<Record<string, string>>({});

  const partnersQuery = useQuery<Partner[]>({
    queryKey: ['admin-delivery-partners'],
    queryFn: adminDeliveryPartners,
  });

  const ordersQuery = useQuery<{
    items: AdminOrder[];
    total: number;
    totalPages: number;
  }>({
    queryKey: ['admin-delivery-ready-orders'],
    queryFn: () =>
      adminOrders({
        page: 1,
        limit: 100,
        status: 'READY_FOR_PICKUP',
      }),
  });

  const assignMutation = useMutation({
    mutationFn: ({
      orderId,
      partnerId,
    }: {
      orderId: string;
      partnerId: string;
    }) =>
      assignAdminDelivery(
        orderId,
        partnerId,
      ),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['admin-delivery-ready-orders'],
      });

      void qc.invalidateQueries({
        queryKey: ['admin-delivery-partners'],
      });
    },
  });

  const activePartners = useMemo(
    () =>
      (partnersQuery.data ?? []).filter(
        (partner) =>
          partner.user.isActive,
      ),
    [partnersQuery.data],
  );

  const readyOrders =
    ordersQuery.data?.items ?? [];

  function assign(orderId: string) {
    const partnerId =
      selectedPartner[orderId];

    if (!partnerId) {
      return;
    }

    assignMutation.mutate({
      orderId,
      partnerId,
    });
  }

  const loading =
    partnersQuery.isPending ||
    ordersQuery.isPending;

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Delivery
          </h1>
        </div>

        <div className="rounded-card bg-surface p-8 text-text-2 shadow-card">
          Loading delivery operations…
        </div>
      </div>
    );
  }

  if (
    partnersQuery.isError ||
    ordersQuery.isError
  ) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Delivery
          </h1>
        </div>

        <div className="rounded-card border border-red-100 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Unable to load delivery data.
          </p>

          <button
            type="button"
            onClick={() => {
              void partnersQuery.refetch();
              void ordersQuery.refetch();
            }}
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Delivery
          </h1>

          <p className="mt-1 text-text-2">
            Assign ready orders to active delivery
            partners.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void partnersQuery.refetch();
            void ordersQuery.refetch();
          }}
          disabled={
            partnersQuery.isFetching ||
            ordersQuery.isFetching
          }
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={[
              'size-4',
              partnersQuery.isFetching ||
              ordersQuery.isFetching
                ? 'animate-spin'
                : '',
            ].join(' ')}
          />

          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Active partners
            </p>

            <UserRound className="size-5 text-grove-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {activePartners.length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Ready for pickup
            </p>

            <Truck className="size-5 text-grove-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {readyOrders.length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Partner accounts
            </p>

            <CheckCircle2 className="size-5 text-grove-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {(partnersQuery.data ?? []).length}
          </p>
        </div>
      </div>

      <section className="rounded-card bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-h2">
            Delivery partners
          </h2>

          <p className="mt-1 text-sm text-text-2">
            Active accounts available for assignment.
          </p>
        </div>

        <div className="divide-y divide-line">
          {partnersQuery.data?.map(
            (partner) => (
              <div
                key={partner.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-grove-50 font-bold text-grove-700">
                    {partner.user.name
                      ?.charAt(0)
                      .toUpperCase() ??
                      'D'}
                  </div>

                  <div>
                    <p className="font-semibold">
                      {partner.user.name}
                    </p>

                    <p className="text-sm text-text-3">
                      {partner.user.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {partner.user.phone && (
                    <span className="text-sm text-text-2">
                      {partner.user.phone}
                    </span>
                  )}

                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      partner.user.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-text-3',
                    ].join(' ')}
                  >
                    {partner.user.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </div>
              </div>
            ),
          )}

          {partnersQuery.data?.length === 0 && (
            <div className="p-8 text-center">
              <p className="font-semibold">
                No delivery partners found.
              </p>

              <p className="mt-1 text-sm text-text-3">
                Create a delivery partner account
                before assigning orders.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-card bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-h2">
            Orders ready for pickup
          </h2>

          <p className="mt-1 text-sm text-text-2">
            These orders can currently be assigned
            to a delivery partner.
          </p>
        </div>

        <div className="divide-y divide-line">
          {readyOrders.map(
            (order) => (
              <div
                key={order.id}
                className="p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">
                        {order.orderNumber}
                      </p>

                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        READY FOR PICKUP
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-text-2">
                      {order.user.name}
                    </p>

                    <p className="text-xs text-text-3">
                      {order.user.email}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="mr-2 text-price">
                      {formatMoney(
                        order.totalPaise,
                      )}
                    </p>

                    <select
                      value={
                        selectedPartner[
                          order.id
                        ] ?? ''
                      }
                      onChange={(event) =>
                        setSelectedPartner(
                          (current) => ({
                            ...current,
                            [order.id]:
                              event.target.value,
                          }),
                        )
                      }
                      className="min-w-52 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-grove-500"
                    >
                      <option value="">
                        Select partner
                      </option>

                      {activePartners.map(
                        (partner) => (
                          <option
                            key={partner.id}
                            value={partner.id}
                          >
                            {partner.user.name}
                          </option>
                        ),
                      )}
                    </select>

                    <button
                      type="button"
                      disabled={
                        !selectedPartner[
                          order.id
                        ] ||
                        assignMutation.isPending
                      }
                      onClick={() =>
                        assign(order.id)
                      }
                      className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-grove-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {assignMutation.isPending
                        ? 'Assigning…'
                        : 'Assign'}
                    </button>
                  </div>
                </div>

                {assignMutation.isError && (
                  <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                    Unable to assign this order.
                    Refresh and try again.
                  </p>
                )}
              </div>
            ),
          )}

          {readyOrders.length === 0 && (
            <div className="p-10 text-center">
              <Truck className="mx-auto size-8 text-grove-600" />

              <p className="mt-3 font-semibold">
                No orders are waiting for pickup.
              </p>

              <p className="mt-1 text-sm text-text-3">
                Orders will appear here once they reach
                READY_FOR_PICKUP.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}