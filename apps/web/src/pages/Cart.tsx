import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (q.isPending) {
    return <p className="pt-8">Loading cart…</p>;
  }

  const c = q.data;

  if (!c || !c.lines.length) {
    return (
      <div className="pt-10 text-center">
        <h1 className="text-display">Your cart is empty</h1>
        <Link
          to="/search"
          className="mt-4 inline-block rounded-full bg-ink px-5 py-3 font-semibold text-white"
        >
          Shop groceries
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-6">
      <h1 className="text-display">Your cart</h1>

      <div className="mt-5 space-y-3">
        {c.lines.map((l) => (
          <div
            key={l.productId}
            className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card"
          >
            <div className="size-20 rounded-tile bg-surface-sunken p-2">
              {l.image && (
                <img
                  src={l.image}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold">{l.name}</p>
              <p className="text-caption text-text-3">{l.unit}</p>
              <p className="mt-1 text-price">
                {formatMoney(l.unitPricePaise)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  update.mutate({
                    id: l.productId,
                    n: l.quantity - 1,
                  })
                }
                className="grid size-8 place-items-center rounded-full bg-surface-sunken"
              >
                −
              </button>

              <span className="w-5 text-center tabular">
                {l.quantity}
              </span>

              <button
                onClick={() =>
                  update.mutate({
                    id: l.productId,
                    n: Math.min(50, l.quantity + 1),
                  })
                }
                className="grid size-8 place-items-center rounded-full bg-surface-sunken"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <b>{formatMoney(c.subtotalPaise)}</b>
        </div>

        <Link
          to="/checkout"
          className="mt-4 block rounded-full bg-ink py-3 text-center font-semibold text-white"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}