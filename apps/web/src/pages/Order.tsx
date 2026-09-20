import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  cancelOrder,
  order,
  reorder,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

export function OrderPage() {
  const { orderId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const payment = (location.state as any)?.payment;

  const q = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => order(orderId),
  });

  const cancel = useMutation({
    mutationFn: () =>
      cancelOrder(orderId, 'Cancelled by customer'),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['order', orderId],
      });
    },
  });

  const ro = useMutation({
    mutationFn: () => reorder(orderId),
    onSuccess: async (result) => {
      await qc.invalidateQueries({
        queryKey: ['cart'],
      });

      navigate('/cart', {
        state: {
          reorderResult: result,
        },
      });
    },
  });

  useEffect(() => {
    if (!q.data || !['PENDING_PAYMENT'].includes(q.data.status)) {
      return;
    }

    const id = setInterval(() => {
      qc.invalidateQueries({
        queryKey: ['order', orderId],
      });
    }, 5000);

    return () => clearInterval(id);
  }, [q.data, orderId, qc]);

  if (q.isPending) {
    return <p className="pt-8">Loading order…</p>;
  }

  if (!q.data) {
    return <p className="pt-8">Order not found.</p>;
  }

  const o = q.data;

  return (
    <div className="pt-6">
      <Link
        to="/orders"
        className="text-sm text-text-2"
      >
        ← Orders
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-display">{o.orderNumber}</h1>

        <span className="rounded-full bg-grove-50 px-3 py-1 text-xs font-semibold">
          {o.status.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="mt-5 rounded-card bg-surface p-5 shadow-card">
        <div className="space-y-4">
          {o.history.map((h, i) => (
            <div
              key={h.createdAt + i}
              className="flex gap-3"
            >
              <span className="mt-1 size-3 rounded-full bg-grove-500" />

              <div>
                <b>{h.status.replaceAll('_', ' ')}</b>

                <p className="text-caption text-text-3">
                  {new Date(h.createdAt).toLocaleString()}
                </p>

                {h.note && (
                  <p className="text-sm text-text-2">
                    {h.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {payment?.upiQr?.payload && (
        <div className="mt-4 rounded-card bg-surface p-5 shadow-card">
          <h2 className="text-h2">Complete payment</h2>

          <p className="mt-1 text-text-2">
            Scan the transaction QR with your UPI app.
            Payment status is verified by Grovia.
          </p>

          {String(payment.upiQr.payload).startsWith('data:image') ? (
            <img
              src={payment.upiQr.payload}
              alt="Cashfree UPI payment QR"
              className="mx-auto mt-4 size-64"
            />
          ) : (
            <a
              href={payment.upiQr.payload}
              className="mt-4 inline-block rounded-full bg-ink px-4 py-2 text-white"
            >
              Open UPI payment
            </a>
          )}
        </div>
      )}

      <div className="mt-4 rounded-card bg-surface p-5 shadow-card">
        {o.items.map((i) => (
          <div
            key={i.productId}
            className="flex justify-between py-2"
          >
            <span>
              {i.name} × {i.quantity}
            </span>

            <b>{formatMoney(i.lineTotalPaise)}</b>
          </div>
        ))}

        <div className="mt-3 flex justify-between border-t border-line pt-3">
          <b>Total</b>
          <b>{formatMoney(o.totalPaise)}</b>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {o.canCancel && (
          <button
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
            className="rounded-full border border-line px-4 py-2 font-semibold disabled:opacity-50"
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}

        <button
          onClick={() => ro.mutate()}
          disabled={ro.isPending}
          className="rounded-full bg-ink px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {ro.isPending ? 'Adding to cart…' : 'Reorder'}
        </button>
      </div>

      {ro.isError && (
        <p className="mt-3 text-sm text-red-600">
          Unable to reorder this order. Please try again.
        </p>
      )}

      {ro.isSuccess && (
        <p className="mt-3 text-sm text-grove-700">
          {ro.data.addedCount > 0
            ? `${ro.data.addedCount} item${
                ro.data.addedCount === 1 ? '' : 's'
              } added to your cart.`
            : 'No items could be added to your cart.'}
        </p>
      )}
    </div>
  );
}