import { useQuery } from '@tanstack/react-query';

import {
  listProducts,
  smartBasket,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

export function SmartBasketPage() {
  const q = useQuery({
    queryKey: ['smart-basket'],
    queryFn: smartBasket,
  });

  const popular = useQuery({
    queryKey: ['smart-basket-popular'],
    queryFn: () =>
      listProducts({
        page: 1,
        pageSize: 6,
        sort: 'rating',
      }),
    enabled: q.isSuccess && q.data?.length === 0,
  });

  const hasPersonalizedBasket =
    (q.data?.length ?? 0) > 0;

  const popularProducts =
    popular.data?.items ?? [];

  return (
    <div className="pt-6">
      <h1 className="text-display">
        Smart Basket
      </h1>

      <p className="mt-1 text-text-2">
        {hasPersonalizedBasket
          ? 'A replenishment list based on your purchase history.'
          : 'Your basket is learning your routine.'}
      </p>

      {hasPersonalizedBasket ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {q.data?.map((x: any) => (
            <div
              key={x.productId}
              className="rounded-card bg-surface p-5 shadow-card"
            >
              <b>{x.name}</b>

              <p className="text-caption text-text-3">
                Suggested quantity: {x.quantity}
              </p>

              <p className="mt-2 text-price">
                {formatMoney(x.pricePaise)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-card bg-surface p-5 shadow-card">
            <h2 className="text-h2">
              Get started
            </h2>

            <p className="mt-1 text-text-2">
              Buy a few groceries and Smart Basket
              will learn what you usually reorder.
            </p>
          </div>

          <div className="mt-5">
            <h2 className="text-h2">
              Popular picks
            </h2>

            <p className="mt-1 text-text-2">
              A few customer favourites to get
              your basket started.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {popularProducts.map((product: any) => (
                <div
                  key={product.id}
                  className="rounded-card bg-surface p-5 shadow-card"
                >
                  <b>{product.name}</b>

                  {product.unit && (
                    <p className="text-caption text-text-3">
                      {product.unit}
                    </p>
                  )}

                  <p className="mt-2 text-price">
                    {formatMoney(product.pricePaise)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}