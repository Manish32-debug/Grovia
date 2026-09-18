import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search, ShoppingCart } from 'lucide-react';
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

  const submit = (e: FormEvent) => {
    e.preventDefault();

    const p = new URLSearchParams(params);

    if (term) {
      p.set('q', term);
    } else {
      p.delete('q');
    }

    setParams(p);
  };

  return (
    <div className="pt-4">
      <form
        onSubmit={submit}
        className="flex gap-2 rounded-card bg-surface p-3 shadow-card"
      >
        <Search size={20} />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search groceries"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              const p = new URLSearchParams(params);
              p.set('category', c.slug);
              setParams(p);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${
              category === c.slug
                ? 'bg-ink text-white'
                : 'bg-surface shadow-card'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {products.isPending ? (
        <p className="mt-8">Loading groceries…</p>
      ) : products.isError ? (
        <p className="mt-8 text-danger">Could not load products.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.data.items.map((p) => (
            <article
              key={p.id}
              className="rounded-card bg-surface p-3 shadow-card"
            >
              <Link to={`/products/${p.slug}`}>
                <div className="aspect-square rounded-tile bg-surface-sunken p-2">
                  {p.primaryImageUrl && (
                    <img
                      src={p.primaryImageUrl}
                      alt={p.name}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>

                <p className="mt-3 text-sm font-semibold">{p.name}</p>
                <p className="text-caption text-text-3">
                  {p.brand ?? p.unit}
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-price tabular">
                    {formatMoney(p.pricePaise)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      add.mutate({ id: p.id });
                    }}
                    className="grid size-9 place-items-center rounded-full bg-grove-500 text-ink"
                    aria-label={`Add ${p.name}`}
                  >
                    <ShoppingCart size={17} />
                  </button>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
