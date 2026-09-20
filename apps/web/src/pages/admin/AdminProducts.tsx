import { useQuery } from '@tanstack/react-query';

import { adminProducts, adjustInventory } from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

type AdminProduct = {
  id: string;
  name: string;
  brand: string | null;
  unit: string;
  pricePaise: number;
  mrpPaise: number;
  discountPercent: number;
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

type AdminProductsResponse = {
  items: AdminProduct[];
  total: number;
  totalPages: number;
};

export function AdminProductsPage() {
  const q = useQuery<AdminProductsResponse>({
    queryKey: ['admin-products'],
    queryFn: () =>
      adminProducts({
        page: 1,
        limit: 50,
      }),
  });

  if (q.isPending) {
    return (
      <p className="pt-8">
        Loading products…
      </p>
    );
  }

  if (q.isError) {
    return (
      <div className="pt-8">
        <h1 className="text-display">
          Products
        </h1>

        <p className="mt-3 text-red-600">
          Unable to load products.
        </p>
      </div>
    );
  }

  const products = q.data?.items ?? [];

  return (
    <div className="space-y-6 pt-6">
      <div>
        <p className="text-caption font-semibold uppercase tracking-[0.12em] text-grove-600">
          Administration
        </p>

        <h1 className="mt-1 text-display">
          Products
        </h1>

        <p className="mt-1 text-text-2">
          Manage catalog visibility, pricing and inventory.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Total products
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {q.data?.total ?? 0}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Active
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {products.filter((p) => p.isActive).length}
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Low stock
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            {
              products.filter((p) => {
                const available =
                  (p.inventory?.stock ?? 0) -
                  (p.inventory?.reserved ?? 0);

                return (
                  available <=
                  (p.inventory?.lowStockThreshold ?? 0)
                );
              }).length
            }
          </p>
        </div>

        <div className="rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-text-3">
            Page
          </p>

          <p className="mt-1 text-2xl font-extrabold tabular">
            1 / {q.data?.totalPages ?? 1}
          </p>
        </div>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-h2">
            Catalog
          </h2>

          <span className="text-sm text-text-3">
            {products.length} shown
          </span>
        </div>

        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          <div className="divide-y divide-line">
            {products.map((product) => {
              const available =
                Math.max(
                  (product.inventory?.stock ?? 0) -
                    (product.inventory?.reserved ?? 0),
                  0,
                );

              const lowStock =
                available <=
                (product.inventory?.lowStockThreshold ?? 0);

              return (
                <div
                  key={product.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">
                        {product.name}
                      </h3>

                      {!product.isActive && (
                        <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                          Inactive
                        </span>
                      )}

                      {lowStock && product.isActive && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          Low stock
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

                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <span className="font-semibold">
                        {formatMoney(product.pricePaise)}
                      </span>

                      {product.mrpPaise !==
                        product.pricePaise && (
                        <span className="text-text-3 line-through">
                          {formatMoney(product.mrpPaise)}
                        </span>
                      )}

                      {product.discountPercent > 0 && (
                        <span className="font-semibold text-grove-700">
                          {product.discountPercent}% off
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-4">
                    <div className="text-right">
                      <p className="text-caption text-text-3">
                        Available
                      </p>

                      <p className="font-bold tabular">
                        {available}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const delta = window.prompt(
                          `Adjust stock for ${product.name}. Enter a positive or negative number:`,
                        );

                        if (!delta) return;

                        const value = Number(delta);

                        if (
                          !Number.isInteger(value) ||
                          value === 0
                        ) {
                          window.alert(
                            'Enter a non-zero whole number.',
                          );
                          return;
                        }

                        adjustInventory(
                          product.id,
                          value,
                          'Admin dashboard adjustment',
                        )
                          .then(() => {
                            void q.refetch();
                          })
                          .catch(() => {
                            window.alert(
                              'Unable to adjust inventory.',
                            );
                          });
                      }}
                      className="rounded-full border border-line px-4 py-2 text-sm font-semibold transition hover:bg-ink hover:text-white"
                    >
                      Adjust stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}