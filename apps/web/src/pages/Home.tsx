import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  listCategories,
  listProducts,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

export function HomePage() {
  const c = useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
  });

  const p = useQuery({
    queryKey: ['featured'],
    queryFn: () =>
      listProducts({
        page: 1,
        pageSize: 8,
        sort: 'rating',
      }),
  });

  return (
    <div className="pt-4">
      <section className="rounded-sheet bg-grove-50 p-6 sm:p-8">
        <p className="text-caption text-grove-600">Grovia</p>

        <h1 className="mt-1 text-display sm:text-4xl">
          Fresh choices.
          <br />
          Everyday.
        </h1>

        <p className="mt-3 max-w-xl text-text-2">
          Quality groceries, simple checkout and delivery that fits your day.
        </p>

        <Link
          to="/search"
          className="mt-5 inline-block rounded-full bg-ink px-5 py-3 font-semibold text-white"
        >
          Shop now
        </Link>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-h2">Categories</h2>

          <Link
            to="/search"
            className="text-sm font-semibold text-grove-600"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {c.data?.map((x) => (
            <Link
              key={x.id}
              to={`/search?category=${x.slug}`}
              className="min-w-32 rounded-card bg-surface p-4 text-center shadow-card"
            >
              <div className="mx-auto size-16 overflow-hidden rounded-full bg-grove-50">
                {x.iconUrl ? (
                  <img
                    src={x.iconUrl}
                    alt={x.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-2xl">
                    🥬
                  </div>
                )}
              </div>

              <p className="mt-2 text-sm font-semibold">
                {x.name}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-h2">Popular picks</h2>

          <Link
            to="/search"
            className="text-sm font-semibold text-grove-600"
          >
            See more
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {p.data?.items.map((x) => (
            <Link
              key={x.id}
              to={`/products/${x.slug}`}
              className="rounded-card bg-surface p-3 shadow-card"
            >
              <div className="aspect-square rounded-tile bg-surface-sunken p-2">
                {x.primaryImageUrl && (
                  <img
                    src={x.primaryImageUrl}
                    alt={x.name}
                    className="h-full w-full object-contain"
                  />
                )}
              </div>

              <p className="mt-2 text-sm font-semibold">
                {x.name}
              </p>

              <p className="text-price">
                {formatMoney(x.pricePaise)}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}