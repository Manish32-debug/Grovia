import { NavLink, Outlet } from 'react-router-dom';
import {
  Boxes,
  Brain,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Truck,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';

const navigation = [
  {
    label: 'Dashboard',
    to: '/admin',
    icon: LayoutDashboard,
    end: true,
  },
  {
    label: 'Products',
    to: '/admin/products',
    icon: Package,
  },
  {
    label: 'Orders',
    to: '/admin/orders',
    icon: ClipboardList,
  },
  {
    label: 'Inventory',
    to: '/admin/inventory',
    icon: Boxes,
  },
  {
    label: 'Categories',
    to: '/admin/categories',
    icon: Settings,
  },
  {
    label: 'Delivery',
    to: '/admin/delivery',
    icon: Truck,
  },
  {
    label: 'Intelligence',
    to: '/admin/intelligence',
    icon: Brain,
  },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#f7f8f3] text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-line bg-white lg:flex lg:flex-col">
          <div className="border-b border-line px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-grove-500 text-white">
                <span className="text-xl font-black">
                  G
                </span>
              </div>

              <div>
                <p className="text-xl font-extrabold tracking-tight">
                  Grovia
                </p>

                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-grove-600">
                  Admin Portal
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            <p className="px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-text-3">
              Management
            </p>

            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition',
                      isActive
                        ? 'bg-grove-50 text-grove-700'
                        : 'text-text-2 hover:bg-slate-50 hover:text-ink',
                    ].join(' ')
                  }
                >
                  <Icon className="size-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-line p-4">
            <div className="mb-3 rounded-xl bg-slate-50 px-3 py-3">
              <p className="truncate text-sm font-semibold">
                {user?.name ?? 'Administrator'}
              </p>

              <p className="truncate text-xs text-text-3">
                {user?.email ?? 'admin@grovia.test'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void signOut()}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-text-2 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-5" />
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-line bg-white/95 px-6 backdrop-blur lg:px-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-grove-600">
                Administration
              </p>

              <h1 className="text-lg font-extrabold">
                Grovia Admin Portal
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-text-2 sm:block">
                {user?.email}
              </span>

              <div className="flex size-10 items-center justify-center rounded-full bg-grove-50 font-bold text-grove-700">
                {user?.name?.charAt(0)?.toUpperCase() ??
                  'A'}
              </div>
            </div>
          </header>

          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}