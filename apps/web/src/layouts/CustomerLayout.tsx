import { NavLink, Outlet } from 'react-router-dom';
import {
  Bell,
  Heart,
  Home,
  Search,
  ShoppingCart,
  User,
  Leaf,
} from 'lucide-react';
import { cn } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Shop', icon: Search },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
];

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function CustomerLayout() {
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-[#f7f8f3] text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Desktop Header */}
      <header className="sticky top-0 z-40 border-b border-[#e7eadf] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-[1280px] items-center gap-8 px-5 lg:px-8">
          {/* Logo */}
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2"
            aria-label="Grovia home"
          >
            <div className="grid size-10 place-items-center rounded-full bg-grove-100 text-grove-600">
              <Leaf size={21} strokeWidth={2.2} />
            </div>

            <div className="leading-none">
              <p className="text-xl font-extrabold tracking-tight text-ink">
                Grovia
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-grove-600">
                Fresh choices
              </p>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 lg:flex"
          >
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cn(
                  'text-sm font-semibold transition-colors',
                  isActive
                    ? 'text-grove-600'
                    : 'text-text-2 hover:text-grove-600',
                )
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/search"
              className={({ isActive }) =>
                cn(
                  'text-sm font-semibold transition-colors',
                  isActive
                    ? 'text-grove-600'
                    : 'text-text-2 hover:text-grove-600',
                )
              }
            >
              Shop
            </NavLink>

            <NavLink
              to="/smart-basket"
              className={({ isActive }) =>
                cn(
                  'text-sm font-semibold transition-colors',
                  isActive
                    ? 'text-grove-600'
                    : 'text-text-2 hover:text-grove-600',
                )
              }
            >
              Smart Basket
            </NavLink>
          </nav>

          {/* Search */}
          <NavLink
            to="/search"
            className="hidden min-w-0 flex-1 items-center gap-3 rounded-full border border-[#e4e7dc] bg-[#f7f8f3] px-4 py-2.5 text-sm text-text-3 transition-colors hover:border-grove-300 hover:bg-white md:flex"
          >
            <Search size={18} strokeWidth={2} />
            <span>Search groceries, fruits, dairy and more...</span>
          </NavLink>

          {/* Header Actions */}
          <div className="ml-auto flex items-center gap-2">
            <NavLink
              to="/notifications"
              aria-label="Notifications"
              className="grid size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-grove-50 hover:text-grove-600"
            >
              <Bell size={20} strokeWidth={2} />
            </NavLink>

            <NavLink
              to="/wishlist"
              aria-label="Wishlist"
              className="hidden size-10 place-items-center rounded-full text-text-2 transition-colors hover:bg-grove-50 hover:text-grove-600 sm:grid"
            >
              <Heart size={20} strokeWidth={2} />
            </NavLink>

            <NavLink
              to="/cart"
              aria-label="Cart"
              className="grid size-10 place-items-center rounded-full bg-grove-500 text-ink transition-transform hover:scale-105"
            >
              <ShoppingCart size={19} strokeWidth={2.2} />
            </NavLink>

            <NavLink
              to="/account"
              aria-label="Account"
              className="hidden size-10 place-items-center rounded-full bg-[#eef1e8] text-text-2 transition-colors hover:bg-grove-50 hover:text-grove-600 sm:grid"
            >
              <User size={19} strokeWidth={2} />
            </NavLink>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <div className="border-b border-[#e7eadf] bg-white px-5 py-4 md:hidden">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-2"
            aria-label="Grovia home"
          >
            <div className="grid size-9 place-items-center rounded-full bg-grove-100 text-grove-600">
              <Leaf size={19} strokeWidth={2.2} />
            </div>

            <div className="leading-none">
              <p className="text-lg font-extrabold tracking-tight">Grovia</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-grove-600">
                Fresh choices
              </p>
            </div>
          </NavLink>

          <div className="flex items-center gap-1">
            <NavLink
              to="/notifications"
              aria-label="Notifications"
              className="grid size-10 place-items-center rounded-full text-text-2 hover:bg-grove-50"
            >
              <Bell size={19} />
            </NavLink>

            <NavLink
              to="/cart"
              aria-label="Cart"
              className="grid size-10 place-items-center rounded-full bg-grove-500 text-ink"
            >
              <ShoppingCart size={18} />
            </NavLink>
          </div>
        </div>

        <NavLink
          to="/search"
          className="mt-4 flex items-center gap-3 rounded-full border border-[#e4e7dc] bg-[#f7f8f3] px-4 py-3 text-sm text-text-3"
        >
          <Search size={18} />
          <span>Search groceries...</span>
        </NavLink>
      </div>

      {/* Greeting strip */}
      <div className="hidden border-b border-[#edf0e8] bg-white md:block">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-3 lg:px-8">
          <div>
            <span className="text-xs text-text-3">{greeting()}, </span>
            <span className="text-xs font-semibold text-text-2">
              {user ? user.name.split(' ')[0] : 'Welcome'}
            </span>
          </div>

          <NavLink
            to="/account"
            className="text-xs font-semibold text-grove-600 hover:text-grove-700"
          >
            My account →
          </NavLink>
        </div>
      </div>

      {/* Page Content */}
      <main id="main" className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-5 md:px-6 lg:px-8 lg:pb-12">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e8df] bg-white/95 backdrop-blur md:hidden"
      >
        <ul className="mx-auto flex max-w-[520px]">
          {[
            ...navItems,
            { to: '/account', label: 'Account', icon: User },
          ].map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-[68px] flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors',
                    isActive
                      ? 'text-grove-600'
                      : 'text-text-3 hover:text-text-2',
                  )
                }
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                  aria-hidden
                />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}