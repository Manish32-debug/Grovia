import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from 'lucide-react';
import {
  addCart,
  listCategories,
  listProducts,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';
import { useState, type FormEvent } from 'react';

const PRODUCT_CATEGORY_SLUGS = new Set([
  'fruits-vegetables',
  'dairy',
  'bakery',
  'rice-grains',
  'staples',
  'beverages',
  'snacks',
  'personal-care',
  'household',
  'frozen-foods',
]);

export function ShopPage() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const category = params.get('category') ?? undefined;

  const [term, setTerm] = useState(q);

  const products = useQuery({
    queryKey: ['products', q, category],
    queryFn: () =>
      listProducts({
        q: q || undefined,
        category,
        page: 1,
        pageSize: 24,
        sort: 'relevance',
      }),
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const add = useMutation({
    mutationFn: ({ id }: { id: string }) => addCart(id, 1),
  });

  const visibleCategories =
    categories.data?.filter((c) =>
      PRODUCT_CATEGORY_SLUGS.has(c.slug),
    ) ?? [];

  const selectedCategoryName =
    visibleCategories.find((c) => c.slug === category)?.name ??
    'All groceries';

  const submit = (e: FormEvent) => {
    e.preventDefault();

    const p = new URLSearchParams(params);

    if (term.trim()) {
      p.set('q', term.trim());
    } else {
      p.delete('q');
    }

    setParams(p);
  };

  const selectCategory = (slug?: string) => {
    const p = new URLSearchParams(params);

    if (slug) {
      p.set('category', slug);
    } else {
      p.delete('category');
    }

    setParams(p);
  };

  return (
    <div className="py-6 sm:py-8">
      {/* Page heading */}
      <section className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-grove-600">
          Grovia shop
        </p>

        <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Find your favourites
            </h1>

            <p className="mt-2 text-sm text-text-3">
              Fresh groceries and everyday essentials, all in one place.
            </p>
          </div>

          {!products.isPending && !products.isError && (
            <p className="text-sm font-semibold text-text-3">
              {products.data.total} products
            </p>
          )}
        </div>
      </section>

      {/* Search */}
      <form
        onSubmit={submit}
        className="flex items-center gap-3 rounded-[24px] border border-[#e5e8df] bg-white p-2 pl-4 shadow-sm"
      >
        <Search
          size={21}
          strokeWidth={2}
          className="shrink-0 text-text-3"
        />

        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search groceries..."
          className="min-w-0 flex-1 bg-transparent py-3 text-sm text-ink outline-none placeholder:text-text-3"
        />

        <button
          type="submit"
          className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
        >
          Search
        </button>
      </form>

      {/* Categories */}
      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-ink">
            Shop by category
          </h2>

          <SlidersHorizontal
            size={17}
            className="text-text-3 sm:hidden"
          />
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2">
          <button
            type="button"
            onClick={() => selectCategory()}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
              !category
                ? 'bg-ink text-white'
                : 'bg-white text-text-2 shadow-sm ring-1 ring-[#e6e9e1] hover:bg-grove-50'
            }`}
          >
            All
          </button>

          {visibleCategories.map((c) => {
            const active = category === c.slug;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCategory(c.slug)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-ink text-white'
                    : 'bg-white text-text-2 shadow-sm ring-1 ring-[#e6e9e1] hover:bg-grove-50'
                }`}
              >
                {active && <Check size={14} />}
                {c.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Results heading */}
      <section className="mt-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-grove-600">
            {q ? `Results for "${q}"` : 'Browse'}
          </p>

          <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
            {selectedCategoryName}
          </h2>
        </div>
      </section>

      {/* Loading */}
      {products.isPending && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-[#edf0e8]"
            >
              <div className="aspect-square animate-pulse rounded-[16px] bg-[#eef1e8]" />

              <div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-[#eef1e8]" />
              <div className="mt-2 h-3 w-2/5 animate-pulse rounded bg-[#eef1e8]" />
              <div className="mt-4 h-5 w-1/3 animate-pulse rounded bg-[#eef1e8]" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {products.isError && (
        <div className="mt-8 rounded-[24px] bg-red-50 px-5 py-8 text-center">
          <p className="font-semibold text-danger">
            Could not load products.
          </p>

          <button
            type="button"
            onClick={() => products.refetch()}
            className="mt-3 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!products.isPending &&
        !products.isError &&
        products.data.items.length === 0 && (
          <div className="mt-8 rounded-[28px] bg-white px-6 py-14 text-center shadow-sm ring-1 ring-[#edf0e8]">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-grove-50 text-3xl">
              🛒
            </div>

            <h3 className="mt-4 text-xl font-extrabold">
              No groceries found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-text-3">
              Try another search or explore one of the categories above.
            </p>

            <button
              type="button"
              onClick={() => {
                setTerm('');
                setParams({});
              }}
              className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white"
            >
              View all groceries
            </button>
          </div>
        )}

      {/* Products */}
      {!products.isPending &&
        !products.isError &&
        products.data.items.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.data.items.map((product) => (
              <article
                key={product.id}
                className="group overflow-hidden rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-[#edf0e8] transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link to={`/products/${product.slug}`}>
                  <div className="relative aspect-square overflow-hidden rounded-[17px] bg-[#f4f5ef] p-3">
                    {product.primaryImageUrl ? (
                      <img
                        src={product.primaryImageUrl}
                        alt={product.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-5xl">
                        🛒
                      </div>
                    )}

                    {product.discountPercent > 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-grove-500 px-2.5 py-1 text-[10px] font-extrabold text-ink">
                        {product.discountPercent}% OFF
                      </span>
                    )}

                    {!product.inStock && (
                      <span className="absolute inset-x-2 bottom-2 rounded-full bg-ink/85 px-3 py-2 text-center text-[11px] font-bold text-white">
                        Out of stock
                      </span>
                    )}
                  </div>
                </Link>

                <div className="px-1 pt-3">
                  <Link to={`/products/${product.slug}`}>
                    <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-ink">
                      {product.name}
                    </p>

                    <p className="mt-1 text-xs text-text-3">
                      {product.brand ?? product.unit}
                    </p>
                  </Link>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-extrabold tabular text-ink">
                        {formatMoney(product.pricePaise)}
                      </p>

                      {product.mrpPaise > product.pricePaise && (
                        <p className="text-xs text-text-3 line-through">
                          {formatMoney(product.mrpPaise)}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!product.inStock || add.isPending}
                      onClick={() => {
                        add.mutate({ id: product.id });
                      }}
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-grove-500 text-ink transition-all hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#e6e9e1] disabled:text-text-3"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <ShoppingCart size={17} strokeWidth={2.2} />
                    </button>
                  </div>

                  {add.isSuccess && (
                    <p className="mt-2 text-[11px] font-semibold text-grove-600">
                      Added to cart
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

      {/* Bottom shopping prompt */}
      {!products.isPending &&
        !products.isError &&
        products.data.items.length > 0 && (
          <section className="mt-10 flex flex-col justify-between gap-4 rounded-[26px] bg-grove-50 px-6 py-6 sm:flex-row sm:items-center sm:px-8">
            <div>
              <p className="text-sm font-extrabold text-ink">
                Looking for something else?
              </p>

              <p className="mt-1 text-xs text-text-2">
                Explore all of Grovia's everyday essentials.
              </p>
            </div>

            <Link
              to="/smart-basket"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white"
            >
              Try Smart Basket
              <ArrowRight size={15} />
            </Link>
          </section>
        )}
    </div>
  );
}