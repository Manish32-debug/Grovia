import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Heart, Home, Search, ShoppingCart, User } from 'lucide-react';
import { cn } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/cart', label: 'Cart', icon: ShoppingCart },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/account', label: 'Account', icon: User },
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
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <header className="rounded-b-sheet bg-ink px-5 pb-9 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div>
            <p className="text-caption text-white/60">{greeting()}</p>
            <p className="text-h2 text-white">
              {user ? user.name.split(' ')[0] : 'Welcome to Grovia'}
            </p>
          </div>
          <NavLink
            to="/notifications"
            aria-label="Notifications"
            className="grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <Bell size={20} strokeWidth={2} />
          </NavLink>
        </div>
      </header>

      <main id="main" className="mx-auto -mt-5 max-w-[1200px] px-5 pb-24">
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto flex max-w-[1200px]">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors',
                    isActive ? 'text-grove-500' : 'text-text-3 hover:text-text-2',
                  )
                }
              >
                <Icon size={20} strokeWidth={2} aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
