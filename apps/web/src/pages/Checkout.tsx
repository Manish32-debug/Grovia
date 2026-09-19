import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Home,
  MapPin,
  Plus,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import {
  addresses,
  slots,
  cart,
  checkout,
} from '@/api/endpoints/store';
import { post } from '@/api/client';
import { formatMoney } from '@/lib/format';

async function openCashfree(sessionId: string) {
  const existing = (window as any).Cashfree;
  const mode =
    import.meta.env.VITE_CASHFREE_MODE === 'production'
      ? 'production'
      : 'sandbox';

  if (existing) {
    await existing({ mode }).checkout({
      paymentSessionId: sessionId,
      redirectTarget: '_self',
    });
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');

    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';

    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Could not load Cashfree checkout.'));

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

const paymentOptions = [
  {
    value: 'UPI_QR',
    label: 'UPI',
    description: 'Pay using any UPI app',
    icon: Smartphone,
  },
  {
    value: 'CARD',
    label: 'Card',
    description: 'Credit or debit card',
    icon: CreditCard,
  },
  {
    value: 'NETBANKING',
    label: 'Netbanking',
    description: 'Pay through your bank',
    icon: Wallet,
  },
  {
    value: 'COD',
    label: 'Cash on delivery',
    description: 'Pay when your order arrives',
    icon: Home,
  },
];

export function CheckoutPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();

  const c = useQuery({
    queryKey: ['cart'],
    queryFn: cart,
  });

  const a = useQuery({
    queryKey: ['addresses'],
    queryFn: addresses,
  });

  const s = useQuery({
    queryKey: ['slots'],
    queryFn: () => slots(),
  });

  const [addressId, setAddressId] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] =
    useState<AddressForm>(emptyAddress);
  const [slotId, setSlotId] = useState('');
  const [mode, setMode] = useState('UPI_QR');
  const [coupon, setCoupon] = useState('');

  useEffect(() => {
    if (!addressId && a.data?.length) {
      const defaultAddress = a.data.find(
        (item: any) => item.isDefault,
      );

      if (defaultAddress) {
        setAddressId(defaultAddress.id);
      }
    }
  }, [a.data, addressId]);

  const addAddress = useMutation({
    mutationFn: () =>
      post<any>('/addresses', {
        ...addressForm,
        line2: addressForm.line2 || undefined,
        landmark: addressForm.landmark || undefined,
      }),

    onSuccess: (newAddress) => {
      queryClient.setQueryData<any[]>(
        ['addresses'],
        (current = []) => [...current, newAddress],
      );

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
        const paymentId = (
          payment as typeof payment & {
            paymentId?: string;
          }
        ).paymentId;

        if (!paymentId) {
          throw new Error(
            'The development payment was created, but its payment ID was not returned.',
          );
        }

        await post<{ confirmed: boolean }>(
          `/payments/${paymentId}/dev-confirm`,
        );

        await queryClient.invalidateQueries({
          queryKey: ['cart'],
        });

        nav(`/orders/${r.order.id}?checkout=1`, {
          state: {
            payment,
            devPaymentConfirmed: true,
          },
        });

        return;
      }

      if (payment?.paymentSessionId) {
        try {
          await openCashfree(payment.paymentSessionId);
          return;
        } catch {
          // Fall through to order page if Cashfree cannot be opened.
        }
      }

      nav(`/orders/${r.order.id}?checkout=1`, {
        state: { payment },
      });
    },
  });

  const updateAddressField = (
    field: keyof AddressForm,
    value: string | boolean,
  ) => {
    setAddressForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  if (c.isPending || a.isPending || s.isPending) {
    return (
      <div className="py-10">
        <div className="h-10 w-44 animate-pulse rounded bg-[#eef1e8]" />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-[24px] bg-[#eef1e8]" />
            <div className="h-40 animate-pulse rounded-[24px] bg-[#eef1e8]" />
            <div className="h-48 animate-pulse rounded-[24px] bg-[#eef1e8]" />
          </div>

          <div className="h-80 animate-pulse rounded-[24px] bg-[#eef1e8]" />
        </div>
      </div>
    );
  }

  const cartData = c.data;
  const savedAddresses = a.data ?? [];

  if (!cartData || cartData.lines.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-grove-50 text-grove-600">
          🛒
        </div>

        <h1 className="mt-5 text-2xl font-extrabold">
          Your cart is empty
        </h1>

        <p className="mt-2 text-sm text-text-3">
          Add some groceries before checking out.
        </p>

        <button
          type="button"
          onClick={() => nav('/search')}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm font-bold text-white"
        >
          Shop groceries
        </button>
      </div>
    );
  }

  const availableSlots =
    s.data?.filter(
      (item: any) => item.bookable && item.available > 0,
    ) ?? [];

  return (
    <div className="py-6 sm:py-8">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => nav('/cart')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-2 transition-colors hover:text-grove-600"
        >
          <ArrowLeft size={16} />
          Back to cart
        </button>

        <p className="mt-5 text-xs font-bold uppercase tracking-[0.15em] text-grove-600">
          Almost there
        </p>

        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Checkout
        </h1>

        <p className="mt-2 text-sm text-text-3">
          Complete your details and place your grocery order.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        {/* Left */}
        <section className="space-y-5">
          {/* Delivery address */}
          <div className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-grove-50 text-grove-600">
                  <MapPin size={19} />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold">
                    Delivery address
                  </h2>

                  <p className="text-xs text-text-3">
                    Where should we deliver your order?
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowAddressForm((value) => !value)
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-[#dfe3d8] px-3.5 py-2 text-xs font-bold transition-colors hover:border-grove-500 hover:bg-grove-50"
              >
                <Plus size={14} />
                {showAddressForm ? 'Cancel' : 'Add address'}
              </button>
            </div>

            {showAddressForm && (
              <form
                className="mt-5 space-y-3 border-t border-[#edf0e8] pt-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  addAddress.mutate();
                }}
              >
                <p className="text-sm font-extrabold">
                  New delivery address
                </p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    ['HOME', 'WORK', 'COLLEGE', 'OTHER'] as const
                  ).map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() =>
                        updateAddressField('label', label)
                      }
                      className={`rounded-[14px] border px-3 py-2.5 text-xs font-bold transition-colors ${
                        addressForm.label === label
                          ? 'border-ink bg-ink text-white'
                          : 'border-[#dfe3d8] bg-white hover:bg-grove-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={addressForm.contactName}
                    onChange={(e) =>
                      updateAddressField(
                        'contactName',
                        e.target.value,
                      )
                    }
                    placeholder="Contact name"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />

                  <input
                    required
                    value={addressForm.contactPhone}
                    onChange={(e) =>
                      updateAddressField(
                        'contactPhone',
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 10),
                      )
                    }
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />
                </div>

                <input
                  required
                  value={addressForm.line1}
                  onChange={(e) =>
                    updateAddressField(
                      'line1',
                      e.target.value,
                    )
                  }
                  placeholder="Address line 1"
                  className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={addressForm.line2}
                    onChange={(e) =>
                      updateAddressField(
                        'line2',
                        e.target.value,
                      )
                    }
                    placeholder="Address line 2 (optional)"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />

                  <input
                    value={addressForm.landmark}
                    onChange={(e) =>
                      updateAddressField(
                        'landmark',
                        e.target.value,
                      )
                    }
                    placeholder="Landmark (optional)"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    required
                    value={addressForm.city}
                    onChange={(e) =>
                      updateAddressField(
                        'city',
                        e.target.value,
                      )
                    }
                    placeholder="City"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />

                  <input
                    required
                    value={addressForm.state}
                    onChange={(e) =>
                      updateAddressField(
                        'state',
                        e.target.value,
                      )
                    }
                    placeholder="State"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />

                  <input
                    required
                    value={addressForm.pincode}
                    onChange={(e) =>
                      updateAddressField(
                        'pincode',
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, 6),
                      )
                    }
                    placeholder="PIN code"
                    inputMode="numeric"
                    className="w-full rounded-[14px] border border-[#dfe3d8] bg-white px-4 py-3 text-sm outline-none transition focus:border-grove-500"
                  />
                </div>

                <label className="flex items-center gap-2 pt-1 text-sm text-text-2">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) =>
                      updateAddressField(
                        'isDefault',
                        e.target.checked,
                      )
                    }
                    className="size-4 accent-[#22b96b]"
                  />

                  Make this my default address
                </label>

                {addAddress.isError && (
                  <p className="rounded-[12px] bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
                    {(addAddress.error as Error).message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={addAddress.isPending}
                  className="w-full rounded-full bg-ink py-3.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
                >
                  {addAddress.isPending
                    ? 'Saving address…'
                    : 'Save address'}
                </button>
              </form>
            )}

            {!showAddressForm && (
              <div className="mt-5 space-y-3">
                {savedAddresses.length ? (
                  savedAddresses.map((x: any) => (
                    <label
                      key={x.id}
                      className={`block cursor-pointer rounded-[18px] border p-4 transition-all ${
                        addressId === x.id
                          ? 'border-grove-500 bg-grove-50/50 ring-1 ring-grove-500'
                          : 'border-[#e1e5dc] bg-white hover:border-grove-300'
                      }`}
                    >
                      <div className="flex gap-3">
                        <input
                          type="radio"
                          name="address"
                          value={x.id}
                          checked={addressId === x.id}
                          onChange={() =>
                            setAddressId(x.id)
                          }
                          className="mt-1 size-4 accent-[#22b96b]"
                        />

                        <span className="min-w-0 text-sm leading-6">
                          <span className="flex flex-wrap items-center gap-2">
                            <b>{x.label}</b>

                            {x.isDefault && (
                              <span className="rounded-full bg-grove-100 px-2 py-0.5 text-[10px] font-bold uppercase text-grove-700">
                                Default
                              </span>
                            )}

                            {addressId === x.id && (
                              <span className="ml-auto grid size-5 place-items-center rounded-full bg-grove-500 text-ink">
                                <Check size={12} strokeWidth={3} />
                              </span>
                            )}
                          </span>

                          <span className="block text-text-2">
                            {x.contactName} · {x.contactPhone}
                          </span>

                          <span className="block text-text-2">
                            {x.line1}
                            {x.line2
                              ? `, ${x.line2}`
                              : ''}
                            {x.landmark
                              ? `, ${x.landmark}`
                              : ''}
                          </span>

                          <span className="block text-text-2">
                            {x.city}, {x.state} - {x.pincode}
                          </span>
                        </span>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-[#d8ddd2] bg-[#fafbf8] p-5">
                    <p className="text-sm font-semibold text-text-2">
                      You don't have a saved delivery address yet.
                    </p>

                    <button
                      type="button"
                      onClick={() => setShowAddressForm(true)}
                      className="mt-4 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white"
                    >
                      Add your delivery address
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delivery slot */}
          <div className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-grove-50 text-grove-600">
                <MapPin size={19} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold">
                  Delivery slot
                </h2>

                <p className="text-xs text-text-3">
                  Choose when you'd like your groceries.
                </p>
              </div>
            </div>

            {availableSlots.length ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {availableSlots.map((x: any) => {
                  const startHour = Math.floor(
                    x.startMinute / 60,
                  );
                  const startMinute = x.startMinute % 60;

                  const endHour = Math.floor(
                    x.endMinute / 60,
                  );
                  const endMinute = x.endMinute % 60;

                  const timeLabel = `${String(startHour).padStart(
                    2,
                    '0',
                  )}:${String(startMinute).padStart(
                    2,
                    '0',
                  )}–${String(endHour).padStart(
                    2,
                    '0',
                  )}:${String(endMinute).padStart(2, '0')}`;

                  const selected = slotId === x.id;

                  return (
                    <label
                      key={x.id}
                      className={`cursor-pointer rounded-[18px] border p-4 transition-all ${
                        selected
                          ? 'border-grove-500 bg-grove-50/60 ring-1 ring-grove-500'
                          : 'border-[#e1e5dc] hover:border-grove-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="slot"
                          value={x.id}
                          checked={selected}
                          onChange={() => setSlotId(x.id)}
                          className="size-4 accent-[#22b96b]"
                        />

                        <div>
                          <p className="text-sm font-bold">
                            {timeLabel}
                          </p>

                          <p className="mt-1 text-xs text-text-3">
                            {x.date}
                          </p>
                        </div>

                        {selected && (
                          <span className="ml-auto grid size-6 place-items-center rounded-full bg-grove-500 text-ink">
                            <Check
                              size={13}
                              strokeWidth={3}
                            />
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-[18px] bg-[#fafbf8] p-4 text-sm text-text-2">
                No delivery slots are currently available.
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-grove-50 text-grove-600">
                <CreditCard size={19} />
              </div>

              <div>
                <h2 className="text-lg font-extrabold">
                  Payment method
                </h2>

                <p className="text-xs text-text-3">
                  Select how you'd like to pay.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const selected = mode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMode(option.value)}
                    className={`flex items-center gap-3 rounded-[18px] border p-4 text-left transition-all ${
                      selected
                        ? 'border-grove-500 bg-grove-50/60 ring-1 ring-grove-500'
                        : 'border-[#e1e5dc] hover:border-grove-300'
                    }`}
                  >
                    <div
                      className={`grid size-10 place-items-center rounded-full ${
                        selected
                          ? 'bg-grove-500 text-ink'
                          : 'bg-[#f1f3ed] text-text-2'
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {option.label}
                      </p>

                      <p className="mt-0.5 text-xs text-text-3">
                        {option.description}
                      </p>
                    </div>

                    {selected && (
                      <span className="ml-auto grid size-6 place-items-center rounded-full bg-grove-500 text-ink">
                        <Check
                          size={13}
                          strokeWidth={3}
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="mt-6 border-t border-[#edf0e8] pt-5">
              <label className="text-sm font-extrabold">
                Have a coupon?
              </label>

              <div className="mt-3 flex gap-2">
                <input
                  value={coupon}
                  onChange={(e) =>
                    setCoupon(e.target.value.toUpperCase())
                  }
                  placeholder="Enter coupon code"
                  className="min-w-0 flex-1 rounded-full border border-[#dfe3d8] bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-grove-500"
                />

                <button
                  type="button"
                  disabled={!coupon.trim()}
                  className="rounded-full bg-[#f0f2eb] px-5 py-3 text-sm font-bold text-text-2 disabled:opacity-40"
                >
                  Apply
                </button>
              </div>

              <p className="mt-2 text-xs text-text-3">
                Your coupon will be validated when the order is placed.
              </p>
            </div>
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
                {cartData.itemCount}{' '}
                {cartData.itemCount === 1
                  ? 'item'
                  : 'items'}
              </span>
            </div>

            <div className="mt-5 max-h-[330px] space-y-3 overflow-y-auto pr-1">
              {cartData.lines.map((l) => (
                <div
                  key={l.productId}
                  className="flex items-center gap-3"
                >
                  <div className="size-12 shrink-0 overflow-hidden rounded-[12px] bg-[#f4f5ef] p-1.5">
                    {l.image ? (
                      <img
                        src={l.image}
                        alt={l.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-lg">
                        🛒
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-bold">
                      {l.name}
                    </p>

                    <p className="mt-0.5 text-[11px] text-text-3">
                      {l.quantity} ×{' '}
                      {formatMoney(l.unitPricePaise)}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs font-bold tabular">
                    {formatMoney(l.lineTotalPaise)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-[#e8ebe3] pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-text-2">Subtotal</span>

                <span className="font-bold tabular">
                  {formatMoney(cartData.subtotalPaise)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-text-2">Delivery</span>

                <span className="font-semibold text-grove-600">
                  Calculated at checkout
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-end justify-between border-t border-[#e8ebe3] pt-5">
              <span className="text-base font-bold">
                Total
              </span>

              <span className="text-2xl font-extrabold tabular">
                {formatMoney(cartData.subtotalPaise)}
              </span>
            </div>

            <button
              disabled={
                !addressId ||
                !slotId ||
                m.isPending
              }
              onClick={() => m.mutate()}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {m.isPending ? (
                'Creating order…'
              ) : (
                <>
                  Place order
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-text-3">
              <ShieldCheck size={15} className="text-grove-600" />
              Secure checkout
            </div>

            {!addressId && (
              <p className="mt-4 rounded-[14px] bg-[#f7f8f3] px-3 py-2.5 text-xs font-semibold text-text-2">
                Select or add a delivery address to continue.
              </p>
            )}

            {addressId && !slotId && (
              <p className="mt-4 rounded-[14px] bg-[#f7f8f3] px-3 py-2.5 text-xs font-semibold text-text-2">
                Select a delivery slot to continue.
              </p>
            )}

            {m.isError && (
              <p className="mt-4 rounded-[14px] bg-red-50 px-3 py-2.5 text-xs font-semibold leading-5 text-danger">
                {(m.error as Error).message}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}