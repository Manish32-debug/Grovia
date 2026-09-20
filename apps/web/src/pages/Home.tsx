import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Apple,
  ArrowRight,
  CakeSlice,
  Cookie,
  CupSoda,
  House,
  Leaf,
  Milk,
  Package,
  ShieldCheck,
  Snowflake,
  Soup,
  Sparkles,
  Truck,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import {
  listCategories,
  listProducts,
} from '@/api/endpoints/store';
import { formatMoney } from '@/lib/format';

const categoryIcons: Record<string, LucideIcon> = {
  'fruits-vegetables': Apple,
  dairy: Milk,
  bakery: CakeSlice,
  beverages: CupSoda,
  snacks: Cookie,
  staples: Wheat,
  'rice-grains': Soup,
  'personal-care': Sparkles,
  household: House,
  'frozen-foods': Snowflake,
};

function getCategoryIcon(slug: string): LucideIcon {
  return categoryIcons[slug] ?? Package;
}

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
    <div className="space-y-10 py-6 sm:space-y-12 sm:py-8">
      {/* Hero */}
      <section className="relative min-h-[390px] overflow-hidden rounded-[32px] bg-[#dcebd1] sm:min-h-[440px]">
        {/* Grocery artwork - intentionally cropped to show only the right side */}
        <div className="absolute inset-y-0 right-0 z-0 w-[58%] overflow-hidden">
          <img
            src="/grovia-hero.png"
            alt=""
            aria-hidden="true"
            className="absolute right-0 top-1/2 h-[145%] w-auto max-w-none -translate-y-1/2"
          />

          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[#dcebd1] to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex min-h-[390px] max-w-[680px] flex-col justify-center px-6 py-10 sm:min-h-[440px] sm:px-10 lg:px-12">
          <div className="mb-4 flex w-fit items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-grove-700 shadow-sm">
            <Leaf size={14} />
            Fresh groceries
          </div>

          <h1 className="max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Fresh choices.
            <br />
            <span className="text-grove-600">Everyday.</span>
          </h1>

          <p className="mt-5 max-w-lg text-sm leading-6 text-text-2 sm:text-base">
            Quality groceries for your everyday needs, carefully selected
            and delivered right to your doorstep.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
            >
              Shop now
              <ArrowRight size={17} />
            </Link>

            <Link
              to="/search"
              className="rounded-full bg-white/90 px-6 py-3.5 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-white"
            >
              Explore categories
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-[#edf0e8]">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-grove-50 text-grove-600">
            <Leaf size={19} />
          </div>

          <div>
            <p className="text-sm font-bold">Fresh products</p>
            <p className="text-xs text-text-3">
              Quality everyday essentials
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-[#edf0e8]">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-grove-50 text-grove-600">
            <Truck size={19} />
          </div>

          <div>
            <p className="text-sm font-bold">Easy delivery</p>
            <p className="text-xs text-text-3">
              Choose a slot that fits you
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-[#edf0e8]">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-grove-50 text-grove-600">
            <ShieldCheck size={19} />
          </div>

          <div>
            <p className="text-sm font-bold">Simple & secure</p>
            <p className="text-xs text-text-3">
              Safe checkout and payments
            </p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-grove-600">
              Shop by
            </p>

            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Top Categories
            </h2>
          </div>

          <Link
            to="/search"
            className="hidden items-center gap-1 text-sm font-bold text-grove-600 sm:flex"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-5 flex gap-5 overflow-x-auto pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {c.data?.map((x) => {
            const Icon = getCategoryIcon(x.slug);

            return (
              <Link
                key={x.id}
                to={`/search?category=${x.slug}`}
                className="group min-w-[92px] shrink-0 text-center sm:min-w-[110px]"
              >
                <div className="mx-auto grid size-[78px] place-items-center rounded-full bg-[#eaf7ef] text-grove-600 shadow-sm ring-1 ring-[#dceee2] transition-all group-hover:scale-105 group-hover:bg-grove-100 sm:size-[90px]">
                  <Icon
                    size={34}
                    strokeWidth={1.8}
                  />
                </div>

                <p className="mt-3 text-xs font-bold leading-4 text-text-2 sm:text-sm">
                  {x.name}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Promotional cards */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/search?category=fruits-vegetables"
          className="group relative min-h-[200px] overflow-hidden rounded-[28px] bg-[#f1e7d2] p-6 sm:p-8"
        >
          <div className="relative z-10 max-w-[58%]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#8b6a38]">
              Farm fresh
            </p>

            <h3 className="mt-2 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
              Fresh & clean,
              <br />
              every day.
            </h3>

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ink">
              Shop produce
              <ArrowRight size={15} />
            </span>
          </div>

          <div className="absolute -bottom-8 -right-3 text-[120px] transition-transform duration-300 group-hover:scale-105">
            🥦
          </div>

          <div className="absolute bottom-2 right-20 text-[65px]">
            🍅
          </div>
        </Link>

        <Link
          to="/search?category=dairy"
          className="group relative min-h-[200px] overflow-hidden rounded-[28px] bg-[#e3f0dc] p-6 sm:p-8"
        >
          <div className="relative z-10 max-w-[58%]">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-grove-700">
              Everyday essentials
            </p>

            <h3 className="mt-2 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">
              Start your
              <br />
              day fresh.
            </h3>

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-ink">
              Explore dairy
              <ArrowRight size={15} />
            </span>
          </div>

          <div className="absolute -bottom-5 -right-2 text-[125px] transition-transform duration-300 group-hover:scale-105">
            🥛
          </div>

          <div className="absolute bottom-4 right-20 text-[55px]">
            🧈
          </div>
        </Link>
      </section>

      {/* Promotional banner */}
      <section className="relative overflow-hidden rounded-[30px] bg-ink px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-grove-400">
            Grovia everyday
          </p>

          <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">
            Everything you need,
            <br />
            in one basket.
          </h2>

          <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
            From breakfast staples to household essentials, build your
            grocery basket in just a few clicks.
          </p>

          <Link
            to="/search"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-grove-500 px-5 py-3 text-sm font-bold text-ink transition-transform hover:scale-[1.02]"
          >
            Start shopping
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="absolute right-[-20px] top-1/2 hidden -translate-y-1/2 text-[180px] opacity-20 sm:block">
          🛒
        </div>
      </section>

      {/* Popular Products */}
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-grove-600">
              Customer favourites
            </p>

            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Popular Picks
            </h2>
          </div>

          <Link
            to="/search"
            className="flex items-center gap-1 text-sm font-bold text-grove-600"
          >
            See more
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {p.data?.items.map((x) => (
            <Link
              key={x.id}
              to={`/products/${x.slug}`}
              className="group overflow-hidden rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-[#edf0e8] transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-square overflow-hidden rounded-[16px] bg-[#f4f5ef] p-3">
                {x.primaryImageUrl ? (
                  <img
                    src={x.primaryImageUrl}
                    alt={x.name}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-4xl">
                    🛒
                  </div>
                )}
              </div>

              <div className="px-1 pt-3">
                <p className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-ink">
                  {x.name}
                </p>

                <p className="mt-1 text-xs text-text-3">
                  {x.brand ?? x.unit}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-base font-extrabold tabular text-ink">
                    {formatMoney(x.pricePaise)}
                  </p>

                  <span className="grid size-8 place-items-center rounded-full bg-grove-500 text-ink transition-transform group-hover:scale-105">
                    <ArrowRight size={15} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Smart Basket */}
      <section className="relative overflow-hidden rounded-[30px] border border-grove-100 bg-grove-50 px-6 py-8 sm:px-10 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-grove-700">
            <Leaf size={18} />

            <span className="text-xs font-bold uppercase tracking-[0.15em]">
              Grovia Smart Basket
            </span>
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Your regular groceries,
            <br />
            ready when you are.
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-6 text-text-2">
            Grovia learns from your purchase history and helps bring back
            the products you regularly buy, so you spend less time searching.
          </p>

          <Link
            to="/smart-basket"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white"
          >
            Open Smart Basket
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="absolute -bottom-16 -right-8 hidden size-64 rounded-full bg-grove-100 sm:block" />

        <div className="absolute bottom-8 right-10 hidden text-7xl sm:block">
          🧺
        </div>
      </section>
    </div>
  );
}