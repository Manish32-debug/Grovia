import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  AlertTriangle,
  Brain,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Package,
} from 'lucide-react';

import {
  adminDemand,
  rebuildAdminAssociations,
  rebuildAdminDemand,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

type DemandRow = {
  id: string;
  productId: string;
  salesLast7: number;
  salesLast30: number;
  avgDailySales: number;
  ewmaDailySales: number;
  daysRemaining: number | null;
  computedAt: string;
  product: {
    id: string;
    name: string;
    pricePaise: number;
    inventory: {
      stock: number;
      reserved: number;
      lowStockThreshold: number;
    } | null;
  };
};

export function AdminIntelligencePage() {
  const qc = useQueryClient();

  const demandQuery = useQuery<DemandRow[]>({
    queryKey: ['admin-intelligence-demand'],
    queryFn: adminDemand,
  });

  const demandMutation = useMutation({
    mutationFn: rebuildAdminDemand,
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ['admin-intelligence-demand'],
      });
    },
  });

  const associationMutation = useMutation({
    mutationFn: rebuildAdminAssociations,
  });

  const rows = demandQuery.data ?? [];

  const summary = useMemo(() => {
    const stockoutRisk = rows.filter(
      (row) =>
        row.daysRemaining !== null &&
        row.daysRemaining <= 7,
    ).length;

    const lowStock = rows.filter((row) => {
      const inventory = row.product.inventory;

      if (!inventory) {
        return false;
      }

      return (
        inventory.stock - inventory.reserved <=
        inventory.lowStockThreshold
      );
    }).length;

    const activeDemand = rows.filter(
      (row) => row.ewmaDailySales > 0,
    ).length;

    const totalUnits7 = rows.reduce(
      (sum, row) => sum + row.salesLast7,
      0,
    );

    return {
      stockoutRisk,
      lowStock,
      activeDemand,
      totalUnits7,
    };
  }, [rows]);

  const riskRows = useMemo(
    () =>
      [...rows]
        .filter(
          (row) =>
            row.daysRemaining !== null &&
            row.daysRemaining <= 14,
        )
        .sort(
          (a, b) =>
            (a.daysRemaining ?? Infinity) -
            (b.daysRemaining ?? Infinity),
        )
        .slice(0, 10),
    [rows],
  );

  const topDemandRows = useMemo(
    () =>
      [...rows]
        .sort(
          (a, b) =>
            b.ewmaDailySales -
            a.ewmaDailySales,
        )
        .slice(0, 10),
    [rows],
  );

  const loading = demandQuery.isPending;

  if (loading) {
    return (
      <div className="space-y-6 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Intelligence
          </h1>
        </div>

        <div className="rounded-card bg-surface p-8 text-text-2 shadow-card">
          Loading intelligence data…
        </div>
      </div>
    );
  }

  if (demandQuery.isError) {
    return (
      <div className="space-y-6 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Intelligence
          </h1>
        </div>

        <div className="rounded-card border border-red-100 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Unable to load intelligence data.
          </p>

          <button
            type="button"
            onClick={() => {
              void demandQuery.refetch();
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

  function daysLabel(days: number | null) {
    if (days === null) {
      return 'No active demand';
    }

    if (days < 1) {
      return 'Less than 1 day';
    }

    return `${days.toFixed(1)} days`;
  }

  function riskClass(days: number | null) {
    if (days === null) {
      return 'bg-slate-100 text-text-3';
    }

    if (days <= 3) {
      return 'bg-red-50 text-red-700';
    }

    if (days <= 7) {
      return 'bg-amber-50 text-amber-700';
    }

    return 'bg-emerald-50 text-emerald-700';
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Intelligence
          </h1>

          <p className="mt-1 max-w-2xl text-text-2">
            Demand signals, stockout risk and
            product relationships generated from
            Grovia order history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              demandMutation.mutate()
            }
            disabled={demandMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-grove-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={[
                'size-4',
                demandMutation.isPending
                  ? 'animate-spin'
                  : '',
              ].join(' ')}
            />

            {demandMutation.isPending
              ? 'Rebuilding…'
              : 'Rebuild demand'}
          </button>

          <button
            type="button"
            onClick={() =>
              associationMutation.mutate()
            }
            disabled={
              associationMutation.isPending
            }
            className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Brain className="size-4" />

            {associationMutation.isPending
              ? 'Rebuilding…'
              : 'Rebuild associations'}
          </button>
        </div>
      </div>

      {(demandMutation.isSuccess ||
        associationMutation.isSuccess) && (
        <div className="rounded-2xl border border-grove-100 bg-grove-50 px-4 py-3 text-sm text-grove-800">
          Intelligence data rebuilt successfully.
        </div>
      )}

      {(demandMutation.isError ||
        associationMutation.isError) && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          A rebuild operation failed. Refresh and
          try again.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Products analysed
            </p>

            <Package className="size-5 text-grove-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {rows.length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Units sold · 7 days
            </p>

            <TrendingUp className="size-5 text-grove-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {summary.totalUnits7}
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Active demand
            </p>

            <Brain className="size-5 text-grove-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {summary.activeDemand}
          </p>

          <p className="mt-1 text-xs text-text-3">
            Products with measurable sales
          </p>
        </div>

        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-caption text-text-3">
              Stockout risk · 7 days
            </p>

            <AlertTriangle className="size-5 text-amber-600" />
          </div>

          <p className="mt-2 text-3xl font-extrabold tabular">
            {summary.stockoutRisk}
          </p>

          <p className="mt-1 text-xs text-text-3">
            {summary.lowStock} currently at or below
            low-stock threshold
          </p>
        </div>
      </div>

      <section className="rounded-card bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-600" />

            <div>
              <h2 className="text-h2">
                Stockout risk
              </h2>

              <p className="mt-1 text-sm text-text-2">
                Products projected to run out within
                the next 14 days using current demand.
              </p>
            </div>
          </div>
        </div>

        {riskRows.length > 0 ? (
          <div className="divide-y divide-line">
            {riskRows.map((row) => {
              const inventory =
                row.product.inventory;

              const sellable = Math.max(
                (inventory?.stock ?? 0) -
                  (inventory?.reserved ?? 0),
                0,
              );

              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {row.product.name}
                    </p>

                    <p className="mt-1 text-sm text-text-3">
                      Sellable stock: {sellable} ·
                      7-day sales: {row.salesLast7}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={[
                        'rounded-full px-3 py-1.5 text-xs font-bold',
                        riskClass(
                          row.daysRemaining,
                        ),
                      ].join(' ')}
                    >
                      {daysLabel(
                        row.daysRemaining,
                      )}
                    </span>

                    <span className="text-price">
                      {formatMoney(
                        row.product.pricePaise,
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <TrendingDown className="mx-auto size-8 text-grove-600" />

            <p className="mt-3 font-semibold">
              No products are projected to run out
              within 14 days.
            </p>

            <p className="mt-1 text-sm text-text-3">
              This is based on the current demand
              model and available stock.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-card bg-surface shadow-card">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-h2">
            Demand signals
          </h2>

          <p className="mt-1 text-sm text-text-2">
            Products ranked by exponentially weighted
            daily demand.
          </p>
        </div>

        <div className="divide-y divide-line">
          {topDemandRows.map((row) => {
            const inventory =
              row.product.inventory;

            const sellable = Math.max(
              (inventory?.stock ?? 0) -
                (inventory?.reserved ?? 0),
              0,
            );

            return (
              <div
                key={row.id}
                className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(90px,1fr))] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {row.product.name}
                  </p>

                  <p className="mt-1 text-xs text-text-3">
                    {formatMoney(
                      row.product.pricePaise,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-3">
                    7 days
                  </p>

                  <p className="mt-1 font-bold tabular">
                    {row.salesLast7}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-3">
                    30 days
                  </p>

                  <p className="mt-1 font-bold tabular">
                    {row.salesLast30}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-3">
                    EWMA / day
                  </p>

                  <p className="mt-1 font-bold tabular">
                    {row.ewmaDailySales.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-3">
                    Sellable
                  </p>

                  <p className="mt-1 font-bold tabular">
                    {sellable}
                  </p>
                </div>
              </div>
            );
          })}

          {topDemandRows.length === 0 && (
            <div className="p-8 text-center">
              <p className="font-semibold">
                No demand statistics available.
              </p>

              <p className="mt-1 text-sm text-text-3">
                Run a demand rebuild to calculate
                product-level signals.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}