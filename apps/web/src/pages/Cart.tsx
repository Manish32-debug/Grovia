import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { cart, updateCart, removeCart } from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

export function CartPage() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['cart'],
    queryFn: cart,
  });

  const update = useMutation({
    mutationFn: async ({ id, n }: { id: string; n: number }) => {
      if (n > 0) {
        await updateCart(id, n);
      } else {
        await removeCart(id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  if (q.isPending) {
    return (
      <div className="py-10">
        <div className="h-10 w-40 animate-pulse rounded bg-[#eef1e8]" />

        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-[22px] bg-[#eef1e8]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-2xl">
          !
        </div>

        <h1 className="mt-5 text-2xl font-extrabold">
          Could not load your cart
        </h1>

        <p className="mt-2 text-sm text-text-3">
          Please try again in a moment.
        </p>

        <button
          type="button"
          onClick={() => q.refetch()}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const c = q.data;

  if (!c || !c.lines.length) {
    return (
      <div className="py-16 text-center sm:py-20">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-grove-50 text-grove-600">
          <ShoppingBag size={34} strokeWidth={1.8} />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-grove-600">
          Grovia
        </p>

        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Your cart is empty
        </h1>

        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-3">
          Looks like you haven't added anything yet. Find something fresh
          and fill your basket.
        </p>

        <Link
          to="/search"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white"
        >
          Shop groceries
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link
            to="/search"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-text-2 transition-colors hover:text-grove-600"
          >
            <ArrowLeft size={16} />
            Continue shopping
          </Link>

          <p className="text-xs font-bold uppercase tracking-[0.15em] text-grove-600">
            Your basket
          </p>

          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Shopping cart
          </h1>

          <p className="mt-2 text-sm text-text-3">
            {c.itemCount}{' '}
            {c.itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        {/* Cart items */}
        <section>
          <div className="space-y-3">
            {c.lines.map((l) => (
              <article
                key={l.productId}
                className="rounded-[24px] bg-white p-3 shadow-sm ring-1 ring-[#edf0e8] sm:p-4"
              >
                <div className="flex gap-4">
                  {/* Product image */}
                  <Link
                    to={`/products/${l.slug}`}
                    className="size-24 shrink-0 overflow-hidden rounded-[18px] bg-[#f4f5ef] p-2 sm:size-28"
                  >
                    {l.image ? (
                      <img
                        src={l.image}
                        alt={l.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl">
                        🛒
                      </div>
                    )}
                  </Link>

                  {/* Product information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          to={`/products/${l.slug}`}
                          className="line-clamp-2 text-sm font-bold leading-5 transition-colors hover:text-grove-600 sm:text-base"
                        >
                          {l.name}
                        </Link>

                        <p className="mt-1 text-xs text-text-3">
                          {l.brand ?? 'Grovia'} · {l.unit}
                        </p>
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            id: l.productId,
                            n: 0,
                          })
                        }
                        className="grid size-8 shrink-0 place-items-center rounded-full text-text-3 transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-40"
                        aria-label={`Remove ${l.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      {/* Price */}
                      <div>
                        <p className="text-base font-extrabold tabular">
                          {formatMoney(l.unitPricePaise)}
                        </p>

                        {l.mrpPaise > l.unitPricePaise && (
                          <del className="text-xs text-text-3">
                            {formatMoney(l.mrpPaise)}
                          </del>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="flex h-9 items-center rounded-full border border-[#dfe3d8] bg-white p-0.5">
                        <button
                          type="button"
                          disabled={update.isPending}
                          onClick={() =>
                            update.mutate({
                              id: l.productId,
                              n: l.quantity - 1,
                            })
                          }
                          className="grid size-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-grove-50 disabled:opacity-40"
                          aria-label={`Decrease ${l.name} quantity`}
                        >
                          <Minus size={14} />
                        </button>

                        <span className="w-8 text-center text-sm font-bold tabular">
                          {l.quantity}
                        </span>

                        <button
                          type="button"
                          disabled={update.isPending || l.quantity >= 50}
                          onClick={() =>
                            update.mutate({
                              id: l.productId,
                              n: Math.min(50, l.quantity + 1),
                            })
                          }
                          className="grid size-8 place-items-center rounded-full text-text-2 transition-colors hover:bg-grove-50 disabled:opacity-40"
                          aria-label={`Increase ${l.name} quantity`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Line total */}
                    <div className="mt-3 border-t border-[#edf0e8] pt-3 text-right">
                      <span className="text-xs text-text-3">
                        Item total{' '}
                      </span>

                      <span className="text-sm font-extrabold tabular">
                        {formatMoney(l.lineTotalPaise)}
                      </span>
                    </div>
                  </div>
                </div>

                {!l.available && (
                  <div className="mt-3 rounded-[14px] bg-red-50 px-3 py-2 text-xs font-semibold text-danger">
                    This item is currently unavailable.
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Order summary */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8] sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">
                Order summary
              </h2>

              <span className="rounded-full bg-grove-50 px-3 py-1 text-xs font-bold text-grove-700">
                {c.itemCount}{' '}
                {c.itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="mt-6 space-y-4 border-b border-[#e8ebe3] pb-5">
              <div className="flex justify-between text-sm">
                <span className="text-text-2">Subtotal</span>
                <span className="font-bold tabular">
                  {formatMoney(c.subtotalPaise)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-text-2">Delivery</span>
                <span className="font-semibold text-grove-600">
                  Calculated at checkout
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="text-base font-bold">Subtotal</span>

              <span className="text-xl font-extrabold tabular">
                {formatMoney(c.subtotalPaise)}
              </span>
            </div>

            <Link
              to="/checkout"
              className="mt-6 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white transition-transform hover:scale-[1.01]"
            >
              Proceed to checkout
              <ArrowRight size={17} />
            </Link>

            <div className="mt-4 rounded-[16px] bg-grove-50 p-3">
              <p className="text-xs font-semibold leading-5 text-grove-800">
                Fresh groceries, simple checkout and delivery that fits
                your day.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}