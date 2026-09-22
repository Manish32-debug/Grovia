import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  RefreshCw,
  Search,
} from 'lucide-react';

import {
  adminProducts,
  adjustInventory,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

type InventoryProduct = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  pricePaise: number;
  isActive: boolean;
  category?: {
    name: string;
  } | null;
  inventory?: {
    stock: number;
    reserved: number;
    lowStockThreshold: number;
  } | null;
};

type InventoryResponse = {
  items: InventoryProduct[];
  total: number;
  totalPages: number;
};

type InventoryFilter =
  | 'ALL'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'HEALTHY';

async function loadAllInventory(): Promise<InventoryResponse> {
  const firstPage =
    await adminProducts({
      page: 1,
      limit: 100,
    });

  const totalPages =
    firstPage.totalPages ?? 1;

  if (totalPages <= 1) {
    return firstPage;
  }

  const remainingPages =
    await Promise.all(
      Array.from(
        { length: totalPages - 1 },
        (_, index) =>
          adminProducts({
            page: index + 2,
            limit: 100,
          }),
      ),
    );

  return {
    items: [
      ...firstPage.items,
      ...remainingPages.flatMap(
        (page) => page.items,
      ),
    ],
    total: firstPage.total,
    totalPages,
  };
}

function availableStock(
  product: InventoryProduct,
) {
  return Math.max(
    (product.inventory?.stock ?? 0) -
      (product.inventory?.reserved ?? 0),
    0,
  );
}

function getInventoryFilter(
  product: InventoryProduct,
): InventoryFilter {
  const available =
    availableStock(product);

  const threshold =
    product.inventory?.lowStockThreshold ?? 0;

  if (available <= 0) {
    return 'OUT_OF_STOCK';
  }

  if (available <= threshold) {
    return 'LOW_STOCK';
  }

  return 'HEALTHY';
}

function filterLabel(
  filter: InventoryFilter,
) {
  switch (filter) {
    case 'LOW_STOCK':
      return 'Low stock';

    case 'OUT_OF_STOCK':
      return 'Out of stock';

    case 'HEALTHY':
      return 'Healthy';

    default:
      return 'All inventory';
  }
}

export function AdminInventoryPage() {
  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState<InventoryFilter>('ALL');

  const [
    updatingProductId,
    setUpdatingProductId,
  ] = useState<string | null>(null);

  const q =
    useQuery<InventoryResponse>({
      queryKey: ['admin-inventory'],
      queryFn: loadAllInventory,
    });

  const products =
    q.data?.items ?? [];

  const stats = useMemo(() => {
    let lowStock = 0;
    let outOfStock = 0;
    let healthy = 0;
    let totalUnits = 0;
    let reservedUnits = 0;

    for (const product of products) {
      const stock =
        product.inventory?.stock ?? 0;

      const reserved =
        product.inventory?.reserved ?? 0;

      totalUnits += stock;
      reservedUnits += reserved;

      const state =
        getInventoryFilter(product);

      if (state === 'OUT_OF_STOCK') {
        outOfStock += 1;
      } else if (state === 'LOW_STOCK') {
        lowStock += 1;
      } else {
        healthy += 1;
      }
    }

    return {
      lowStock,
      outOfStock,
      healthy,
      totalUnits,
      reservedUnits,
    };
  }, [products]);

  const filteredProducts =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return products.filter(
        (product) => {
          const matchesSearch =
            !query ||
            product.name
              .toLowerCase()
              .includes(query) ||
            product.brand
              ?.toLowerCase()
              .includes(query) ||
            product.category?.name
              ?.toLowerCase()
              .includes(query);

          const matchesFilter =
            filter === 'ALL' ||
            getInventoryFilter(product) ===
              filter;

          return (
            matchesSearch &&
            matchesFilter
          );
        },
      );
    }, [
      products,
      search,
      filter,
    ]);

  async function handleAdjustment(
    product: InventoryProduct,
  ) {
    const value =
      window.prompt(
        `Adjust stock for ${product.name}.\n\nEnter a positive number to add stock or a negative number to remove stock.`,
      );

    if (!value?.trim()) {
      return;
    }

    const delta = Number(value);

    if (
      !Number.isInteger(delta) ||
      delta === 0
    ) {
      window.alert(
        'Enter a non-zero whole number.',
      );

      return;
    }

    const available =
      availableStock(product);

    if (
      delta < 0 &&
      Math.abs(delta) > available
    ) {
      window.alert(
        `You cannot remove ${Math.abs(delta)} units. Only ${available} units are currently available.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        `${delta > 0 ? 'Add' : 'Remove'} ${Math.abs(delta)} unit${Math.abs(delta) === 1 ? '' : 's'} ${delta > 0 ? 'to' : 'from'} ${product.name}?`,
      );

    if (!confirmed) {
      return;
    }

    setUpdatingProductId(
      product.id,
    );

    try {
      await adjustInventory(
        product.id,
        delta,
        'Admin inventory dashboard adjustment',
      );

      await q.refetch();
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to adjust inventory.',
      );
    } finally {
      setUpdatingProductId(
        null,
      );
    }
  }

  if (q.isPending) {
    return (
      <div className="space-y-4 pt-6">
        <div>
          <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
            Administration
          </p>

          <h1 className="mt-1 text-display">
            Inventory
          </h1>
        </div>

        <div className="rounded-card bg-surface p-8 text-text-2 shadow-card">
          Loading inventory…
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
            Inventory
          </h1>
        </div>

        <div className="rounded-card border border-red-100 bg-red-50 p-6">
          <p className="font-semibold text-red-700">
            Unable to load inventory.
          </p>

          <button
            type="button"
            onClick={() =>
              void q.refetch()
            }
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
            Inventory
          </h1>

          <p className="mt-1 text-text-2">
            Monitor stock levels and make
            controlled inventory adjustments.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void q.refetch()
          }
          disabled={q.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            className={[
              'size-4',
              q.isFetching
                ? 'animate-spin'
                : '',
            ].join(' ')}
          />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Products
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {products.length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Healthy
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular text-emerald-700">
            {stats.healthy}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Low stock
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular text-amber-700">
            {stats.lowStock}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Out of stock
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular text-red-600">
            {stats.outOfStock}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Reserved units
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {stats.reservedUnits}
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
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search product, brand or category…"
              className="w-full rounded-xl border border-line bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-grove-500"
            />
          </div>

          <select
            value={filter}
            onChange={(event) =>
              setFilter(
                event.target
                  .value as InventoryFilter,
              )
            }
            className="rounded-xl border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-grove-500"
          >
            <option value="ALL">
              All inventory
            </option>

            <option value="LOW_STOCK">
              Low stock
            </option>

            <option value="OUT_OF_STOCK">
              Out of stock
            </option>

            <option value="HEALTHY">
              Healthy
            </option>
          </select>
        </div>
      </section>

      <section className="overflow-hidden rounded-card bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-h2">
              Stock levels
            </h2>

            <p className="mt-1 text-sm text-text-2">
              {filteredProducts.length}{' '}
              product
              {filteredProducts.length ===
              1
                ? ''
                : 's'}{' '}
              · {filterLabel(filter)}
            </p>
          </div>

          <Boxes className="size-5 text-grove-600" />
        </div>

        <div className="divide-y divide-line">
          {filteredProducts.map(
            (product) => {
              const stock =
                product.inventory
                  ?.stock ?? 0;

              const reserved =
                product.inventory
                  ?.reserved ?? 0;

              const available =
                availableStock(
                  product,
                );

              const threshold =
                product.inventory
                  ?.lowStockThreshold ??
                0;

              const state =
                getInventoryFilter(
                  product,
                );

              const updating =
                updatingProductId ===
                product.id;

              return (
                <div
                  key={product.id}
                  className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">
                        {product.name}
                      </h3>

                      {!product.isActive && (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-text-3">
                          Inactive
                        </span>
                      )}

                      {state ===
                        'LOW_STOCK' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          <AlertTriangle className="size-3.5" />
                          Low stock
                        </span>
                      )}

                      {state ===
                        'OUT_OF_STOCK' && (
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                          Out of stock
                        </span>
                      )}

                      {state ===
                        'HEALTHY' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          <PackageCheck className="size-3.5" />
                          Healthy
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-text-2">
                      {product.brand
                        ? `${product.brand} · `
                        : ''}
                      {product.unit}

                      {product.category?.name
                        ? ` · ${product.category.name}`
                        : ''}
                    </p>

                    <p className="mt-2 text-sm font-semibold">
                      {formatMoney(
                        product.pricePaise,
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 sm:w-[360px]">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-text-3">
                        Stock
                      </p>

                      <p className="mt-1 font-bold tabular">
                        {stock}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-text-3">
                        Reserved
                      </p>

                      <p className="mt-1 font-bold tabular">
                        {reserved}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-text-3">
                        Available
                      </p>

                      <p
                        className={[
                          'mt-1 font-bold tabular',
                          state ===
                          'OUT_OF_STOCK'
                            ? 'text-red-600'
                            : state ===
                                'LOW_STOCK'
                              ? 'text-amber-700'
                              : 'text-emerald-700',
                        ].join(' ')}
                      >
                        {available}
                      </p>
                    </div>

                    <div className="col-span-3 flex items-center justify-between rounded-xl border border-line px-3 py-2">
                      <span className="text-xs text-text-3">
                        Low-stock threshold:{' '}
                        <b className="text-ink">
                          {threshold}
                        </b>
                      </span>

                      <button
                        type="button"
                        disabled={updating}
                        onClick={() =>
                          void handleAdjustment(
                            product,
                          )
                        }
                        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white transition hover:bg-grove-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updating
                          ? 'Updating…'
                          : 'Adjust stock'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {filteredProducts.length ===
          0 && (
          <div className="p-10 text-center">
            <p className="font-semibold">
              No inventory matches found.
            </p>

            <p className="mt-1 text-sm text-text-3">
              Try another search or
              inventory filter.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}