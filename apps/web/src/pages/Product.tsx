import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingCart,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import {
  addCart,
  productBySlug,
  recommendations,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

export function ProductPage() {
  const { slug = '' } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

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
    mutationFn: () => addCart(p.data!.id, quantity),
  });

  if (p.isPending) {
    return (
      <div className="py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-[28px] bg-[#eef1e8]" />

          <div className="space-y-4 py-4">
            <div className="h-4 w-24 animate-pulse rounded bg-[#eef1e8]" />
            <div className="h-12 w-4/5 animate-pulse rounded bg-[#eef1e8]" />
            <div className="h-5 w-32 animate-pulse rounded bg-[#eef1e8]" />
            <div className="h-10 w-40 animate-pulse rounded bg-[#eef1e8]" />
            <div className="h-24 w-full animate-pulse rounded bg-[#eef1e8]" />
          </div>
        </div>
      </div>
    );
  }

  if (p.isError || !p.data) {
    return (
      <div className="py-16 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-grove-50 text-3xl">
          🛒
        </div>

        <h1 className="mt-5 text-2xl font-extrabold">
          Product not found
        </h1>

        <p className="mt-2 text-sm text-text-3">
          This product may no longer be available.
        </p>

        <Link
          to="/search"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white"
        >
          <ArrowLeft size={16} />
          Back to shop
        </Link>
      </div>
    );
  }

  const x = p.data;
  const recommendedProducts = rec.data ?? [];
  const images = x.images ?? [];
  const currentImage = images[selectedImage] ?? images[0];

  const discount =
    x.mrpPaise > x.pricePaise
      ? Math.round(
          ((x.mrpPaise - x.pricePaise) / x.mrpPaise) * 100,
        )
      : 0;

  return (
    <div className="py-6 sm:py-8">
      {/* Back */}
      <Link
        to="/search"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-2 transition-colors hover:text-grove-600"
      >
        <ArrowLeft size={17} />
        Back to shop
      </Link>

      {/* Main product */}
      <section className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        {/* Images */}
        <div>
          <div className="relative overflow-hidden rounded-[30px] bg-white p-4 shadow-sm ring-1 ring-[#edf0e8] sm:p-6">
            <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[#f4f5ef]">
              {currentImage?.url ? (
                <img
                  src={currentImage.url}
                  alt={currentImage.alt || x.name}
                  className="h-full w-full object-contain p-6 sm:p-10"
                />
              ) : (
                <div className="grid h-full place-items-center text-7xl">
                  🛒
                </div>
              )}

              {discount > 0 && (
                <span className="absolute left-4 top-4 rounded-full bg-grove-500 px-3 py-1.5 text-xs font-extrabold text-ink">
                  {discount}% OFF
                </span>
              )}

              {!x.inStock && (
                <div className="absolute inset-0 grid place-items-center bg-ink/10 backdrop-blur-[1px]">
                  <span className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white">
                    Out of stock
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Image thumbnails */}
          {images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={`${image.url}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`size-20 shrink-0 overflow-hidden rounded-[16px] bg-white p-1.5 transition-all ${
                    selectedImage === index
                      ? 'ring-2 ring-grove-500'
                      : 'ring-1 ring-[#e7eadf]'
                  }`}
                  aria-label={`View image ${index + 1}`}
                >
                  <img
                    src={image.url}
                    alt={image.alt || x.name}
                    className="h-full w-full rounded-[11px] object-contain"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product information */}
        <div className="flex flex-col justify-center">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-grove-600">
                {x.brand ?? x.category?.name ?? 'Grovia'}
              </p>

              <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
                {x.name}
              </h1>

              <p className="mt-2 text-sm text-text-3">
                {x.unit}
              </p>
            </div>

            <button
              type="button"
              aria-label="Add to wishlist"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f1f3ed] text-text-2 transition-colors hover:bg-grove-50 hover:text-grove-600"
            >
              <Heart size={19} />
            </button>
          </div>

          {/* Rating */}
          <Link
            to={`/reviews/${x.id}`}
            className="mt-5 flex w-fit items-center gap-2 rounded-full bg-[#f7f8f3] px-3 py-2 transition-colors hover:bg-grove-50"
          >
            <Star
              size={16}
              className="fill-current text-[#e8a92f]"
            />

            <span className="text-sm font-bold">
              {x.ratingAvg.toFixed(1)}
            </span>

            <span className="text-xs text-text-3">
              {x.ratingCount}{' '}
              {x.ratingCount === 1 ? 'review' : 'reviews'}
            </span>
          </Link>

          {/* Price */}
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-extrabold tracking-tight tabular text-ink">
              {formatMoney(x.pricePaise)}
            </span>

            {x.mrpPaise > x.pricePaise && (
              <>
                <del className="pb-1 text-sm text-text-3">
                  {formatMoney(x.mrpPaise)}
                </del>

                <span className="mb-1 rounded-full bg-grove-50 px-2.5 py-1 text-xs font-bold text-grove-700">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mt-5">
            {x.inStock ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-grove-700">
                <span className="grid size-5 place-items-center rounded-full bg-grove-500">
                  <Check size={12} strokeWidth={3} />
                </span>
                In stock
              </div>
            ) : (
              <p className="text-sm font-semibold text-danger">
                Currently unavailable
              </p>
            )}
          </div>

          {/* Description */}
          {x.description && (
            <div className="mt-6 border-t border-[#e8ebe3] pt-6">
              <h2 className="text-sm font-extrabold">
                About this product
              </h2>

              <p className="mt-2 text-sm leading-6 text-text-2">
                {x.description}
              </p>
            </div>
          )}

          {/* Quantity + cart */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <div className="flex h-12 items-center justify-between rounded-full border border-[#dfe3d8] bg-white px-2">
              <button
                type="button"
                disabled={!x.inStock || quantity <= 1}
                onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
                }
                className="grid size-9 place-items-center rounded-full text-text-2 transition-colors hover:bg-grove-50 disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>

              <span className="min-w-8 text-center text-sm font-bold tabular">
                {quantity}
              </span>

              <button
                type="button"
                disabled={!x.inStock}
                onClick={() =>
                  setQuantity((current) => current + 1)
                }
                className="grid size-9 place-items-center rounded-full text-text-2 transition-colors hover:bg-grove-50 disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              disabled={!x.inStock || add.isPending}
              onClick={() => add.mutate()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart size={18} />

              {add.isPending
                ? 'Adding...'
                : x.inStock
                  ? 'Add to cart'
                  : 'Out of stock'}
            </button>
          </div>

          {add.isSuccess && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-grove-50 px-4 py-2.5 text-xs font-bold text-grove-700">
              <Check size={14} />
              Added to your cart
            </div>
          )}
        </div>
      </section>

      {/* Product details */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-3">
            Brand
          </p>

          <p className="mt-2 text-sm font-bold">
            {x.brand ?? 'Grovia'}
          </p>
        </div>

        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-3">
            Category
          </p>

          <p className="mt-2 text-sm font-bold">
            {x.category?.name ?? 'Groceries'}
          </p>
        </div>

        <div className="rounded-[22px] bg-white p-5 shadow-sm ring-1 ring-[#edf0e8]">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-text-3">
            Unit
          </p>

          <p className="mt-2 text-sm font-bold">
            {x.unit}
          </p>
        </div>
      </section>

      {/* Tags */}
      {x.tags && x.tags.length > 0 && (
        <section className="mt-6 rounded-[24px] bg-grove-50 px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-grove-700">
            Product information
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {x.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-text-2"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {recommendedProducts.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-grove-600">
                You may also like
              </p>

              <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Frequently bought together
              </h2>
            </div>

            <Link
              to="/search"
              className="hidden items-center gap-1 text-sm font-bold text-grove-600 sm:flex"
            >
              View shop
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recommendedProducts.map((r: any) => (
              <Link
                key={r.productId}
                to={`/products/${r.slug}`}
                className="group overflow-hidden rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-[#edf0e8] transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-square overflow-hidden rounded-[16px] bg-[#f4f5ef] p-3">
                  {r.image ? (
                    <img
                      src={r.image}
                      alt={r.name}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-4xl">
                      🛒
                    </div>
                  )}
                </div>

                <div className="px-1 pt-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5">
                    {r.name}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-base font-extrabold tabular">
                      {formatMoney(r.pricePaise)}
                    </p>

                    <span className="grid size-8 place-items-center rounded-full bg-grove-500 text-ink">
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}