import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { addresses, slots, cart, checkout } from '@/api/endpoints/store';
import { post } from '@/api/client';
import { formatMoney } from '@/lib/format';

async function openCashfree(sessionId: string) {
  const existing = (window as any).Cashfree;
  const mode = import.meta.env.VITE_CASHFREE_MODE === 'production' ? 'production' : 'sandbox';

  if (existing) {
    await existing({ mode }).checkout({ paymentSessionId: sessionId, redirectTarget: '_self' });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Cashfree checkout.'));
    document.body.appendChild(script);
  });

  await (window as any).Cashfree({ mode }).checkout({
    paymentSessionId: sessionId,
    redirectTarget: '_self',
  });
}

type AddressForm = {
  label: 'HOME' | 'WORK' | 'COLLEGE' | 'OTHER';
  contactName: string;
  contactPhone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const emptyAddress: AddressForm = {
  label: 'HOME',
  contactName: '',
  contactPhone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

export function CheckoutPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const c = useQuery({ queryKey: ['cart'], queryFn: cart });
  const a = useQuery({ queryKey: ['addresses'], queryFn: addresses });
  const s = useQuery({ queryKey: ['slots'], queryFn: () => slots() });

  const [addressId, setAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>(emptyAddress);
  const [slotId, setSlotId] = useState('');
  const [mode, setMode] = useState('UPI_QR');
  const [coupon, setCoupon] = useState('');

  const addAddress = useMutation({
    mutationFn: () =>
      post<any>('/addresses', {
        ...addressForm,
        line2: addressForm.line2 || undefined,
        landmark: addressForm.landmark || undefined,
      }),
    onSuccess: (newAddress) => {
      queryClient.setQueryData<any[]>(['addresses'], (current = []) => [...current, newAddress]);
      setAddressId(newAddress.id);
      setAddressForm(emptyAddress);
      setShowAddressForm(false);
    },
  });

  const m = useMutation({
    mutationFn: () =>
      checkout({
        addressId,
        slotInstanceId: slotId,
        paymentMode: mode,
        couponCode: coupon || undefined,
        idempotencyKey: crypto.randomUUID(),
      }),
    onSuccess: async (r) => {
      const payment = r.payment;

      if (payment?.gatewayOrderId?.startsWith('mock_')) {
        const paymentId = (payment as typeof payment & { paymentId?: string }).paymentId;
        if (!paymentId) throw new Error('The development payment was created, but its payment ID was not returned.');

        await post<{ confirmed: boolean }>(`/payments/${paymentId}/dev-confirm`);
        await queryClient.invalidateQueries({ queryKey: ['cart'] });

        nav(`/orders/${r.order.id}?checkout=1`, {
          state: { payment, devPaymentConfirmed: true },
        });
        return;
      }

      if (payment?.paymentSessionId) {
        try {
          await openCashfree(payment.paymentSessionId);
          return;
        } catch {
          // Fall through to the order page if Cashfree cannot be opened.
        }
      }

      nav(`/orders/${r.order.id}?checkout=1`, { state: { payment } });
    },
  });

  const updateAddressField = (field: keyof AddressForm, value: string | boolean) => {
    setAddressForm((current) => ({ ...current, [field]: value }));
  };

  if (c.isPending || a.isPending || s.isPending) {
    return <p className="pt-8">Preparing checkout…</p>;
  }

  return (
    <div className="pt-6">
      <h1 className="text-display">Checkout</h1>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="rounded-card bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h2">Delivery address</h2>
              <button
                type="button"
                onClick={() => setShowAddressForm((value) => !value)}
                className="rounded-full border border-line px-4 py-2 text-sm font-semibold"
              >
                {showAddressForm ? 'Cancel' : '+ Add address'}
              </button>
            </div>

            {showAddressForm && (
              <form
                className="mt-4 space-y-3 border-t border-line pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  addAddress.mutate();
                }}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(['HOME', 'WORK', 'COLLEGE', 'OTHER'] as const).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => updateAddressField('label', label)}
                      className={`rounded-tile border px-3 py-2 text-sm font-semibold ${
                        addressForm.label === label ? 'border-ink bg-ink text-white' : 'border-line bg-surface'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input required value={addressForm.contactName} onChange={(e) => updateAddressField('contactName', e.target.value)} placeholder="Contact name" className="w-full rounded-tile border border-line p-3" />
                  <input required value={addressForm.contactPhone} onChange={(e) => updateAddressField('contactPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" className="w-full rounded-tile border border-line p-3" />
                </div>

                <input required value={addressForm.line1} onChange={(e) => updateAddressField('line1', e.target.value)} placeholder="Address line 1" className="w-full rounded-tile border border-line p-3" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={addressForm.line2} onChange={(e) => updateAddressField('line2', e.target.value)} placeholder="Address line 2 (optional)" className="w-full rounded-tile border border-line p-3" />
                  <input value={addressForm.landmark} onChange={(e) => updateAddressField('landmark', e.target.value)} placeholder="Landmark (optional)" className="w-full rounded-tile border border-line p-3" />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input required value={addressForm.city} onChange={(e) => updateAddressField('city', e.target.value)} placeholder="City" className="w-full rounded-tile border border-line p-3" />
                  <input required value={addressForm.state} onChange={(e) => updateAddressField('state', e.target.value)} placeholder="State" className="w-full rounded-tile border border-line p-3" />
                  <input required value={addressForm.pincode} onChange={(e) => updateAddressField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="PIN code" inputMode="numeric" className="w-full rounded-tile border border-line p-3" />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => updateAddressField('isDefault', e.target.checked)} />
                  Make this my default address
                </label>

                {addAddress.isError && <p className="text-sm text-danger">{(addAddress.error as Error).message}</p>}

                <button type="submit" disabled={addAddress.isPending} className="w-full rounded-full bg-ink py-3 font-semibold text-white disabled:opacity-50">
                  {addAddress.isPending ? 'Saving address…' : 'Save address'}
                </button>
              </form>
            )}

            {!showAddressForm && (
              <div className="mt-3 space-y-2">
                {a.data?.length ? (
                  a.data.map((x: any) => (
                    <label key={x.id} className="flex gap-3 rounded-tile border border-line p-3">
                      <input type="radio" name="address" value={x.id} checked={addressId === x.id} onChange={() => setAddressId(x.id)} />
                      <span>
                        <b>{x.label}{x.isDefault ? ' · Default' : ''}</b><br />
                        {x.contactName} · {x.contactPhone}<br />
                        {x.line1}{x.line2 ? `, ${x.line2}` : ''}{x.landmark ? `, ${x.landmark}` : ''}<br />
                        {x.city}, {x.state} - {x.pincode}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="rounded-tile border border-dashed border-line p-4">
                    <p className="text-sm text-text-2">You don't have a saved delivery address yet.</p>
                    <button type="button" onClick={() => setShowAddressForm(true)} className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
                      Add your delivery address
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-card bg-surface p-5 shadow-card">
            <h2 className="text-h2">Delivery slot</h2>
            <div className="mt-3 grid gap-2">
              {s.data?.filter((x: any) => x.bookable && x.available > 0).map((x: any) => (
                <label key={x.id} className="flex gap-3 rounded-tile border border-line p-3">
                  <input type="radio" name="slot" value={x.id} checked={slotId === x.id} onChange={() => setSlotId(x.id)} />
                  <span>
                    {x.date} · {String(Math.floor(x.startMinute / 60)).padStart(2, '0')}:{String(x.startMinute % 60).padStart(2, '0')}–{String(Math.floor(x.endMinute / 60)).padStart(2, '0')}:{String(x.endMinute % 60).padStart(2, '0')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-card bg-surface p-5 shadow-card">
            <h2 className="text-h2">Payment</h2>
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-3 w-full rounded-tile border border-line bg-surface p-3">
              <option value="UPI_QR">UPI QR</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Netbanking</option>
              <option value="COD">Cash on delivery</option>
            </select>
            <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon code" className="mt-3 w-full rounded-tile border border-line p-3" />
          </div>
        </section>

        <aside className="h-fit rounded-card bg-surface p-5 shadow-card">
          <h2 className="text-h2">Order summary</h2>
          {c.data?.lines.map((l) => (
            <div key={l.productId} className="mt-3 flex justify-between text-sm">
              <span>{l.name} × {l.quantity}</span>
              <span>{formatMoney(l.lineTotalPaise)}</span>
            </div>
          ))}
          <div className="mt-5 flex justify-between border-t border-line pt-4">
            <b>Subtotal</b><b>{formatMoney(c.data?.subtotalPaise ?? 0)}</b>
          </div>
          <button disabled={!addressId || !slotId || m.isPending} onClick={() => m.mutate()} className="mt-5 w-full rounded-full bg-ink py-3 font-semibold text-white disabled:opacity-50">
            {m.isPending ? 'Creating order…' : 'Place order'}
          </button>
          {!addressId && <p className="mt-3 text-sm text-text-2">Select or add a delivery address to continue.</p>}
          {m.isError && <p className="mt-3 text-danger">{(m.error as Error).message}</p>}
        </aside>
      </div>
    </div>
  );
}
