import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Star } from 'lucide-react';
import {
  addCart,
  productBySlug,
  recommendations,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

export function ProductPage() {
  const { slug = '' } = useParams();

  const p = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productBySlug(slug),
  });

  const rec = useQuery({
    queryKey: ['recs', p.data?.id],
    queryFn: () => recommendations(p.data!.id),
    enabled: !!p.data?.id,
  });

  const add = useMutation({
    mutationFn: () => addCart(p.data!.id, 1),
  });

  if (p.isPending) {
    return <p className="pt-8">Loading product…</p>;
  }

  if (p.isError || !p.data) {
    return <p className="pt-8 text-danger">Product not found.</p>;
  }

  const x = p.data;
  const recommendedProducts = rec.data ?? [];

  return (
    <div className="pt-4">
      <Link
        to="/search"
        className="inline-flex items-center gap-2 text-sm text-text-2"
      >
        <ArrowLeft size={16} />
        Back to shop
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div className="rounded-card bg-surface p-5 shadow-card">
          <div className="aspect-square rounded-tile bg-surface-sunken p-5">
            {x.images?.[0]?.url && (
              <img
                src={x.images[0].url}
                alt={x.images[0].alt}
                className="h-full w-full object-contain"
              />
            )}
          </div>
        </div>

        <div className="py-2">
          <p className="text-caption text-text-3">
            {x.brand ?? x.category?.name}
          </p>

          <h1 className="mt-1 text-display">{x.name}</h1>

          <p className="mt-2 text-text-2">{x.unit}</p>

          <div className="mt-3 flex items-center gap-2">
            <Star size={17} className="fill-current" />
            <b>{x.ratingAvg.toFixed(1)}</b>
            <span className="text-text-3">({x.ratingCount})</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-2xl font-extrabold tabular">
              {formatMoney(x.pricePaise)}
            </span>

            {x.mrpPaise > x.pricePaise && (
              <del className="text-text-3">
                {formatMoney(x.mrpPaise)}
              </del>
            )}
          </div>

          <p className="mt-5 text-text-2">{x.description}</p>

          <button
            disabled={!x.inStock || add.isPending}
            onClick={() => add.mutate()}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            <ShoppingCart size={18} />
            {x.inStock ? 'Add to cart' : 'Out of stock'}
          </button>
        </div>
      </div>

      {recommendedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-h2">Frequently bought together</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recommendedProducts.map((r: any) => (
              <Link
                key={r.productId}
                to={`/products/${r.slug}`}
                className="rounded-card bg-surface p-3 shadow-card"
              >
                <p className="font-semibold">{r.name}</p>
                <p className="mt-1 text-price">
                  {formatMoney(r.pricePaise)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}