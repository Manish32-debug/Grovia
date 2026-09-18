import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="rounded-b-sheet bg-ink px-5 pb-10 pt-[calc(env(safe-area-inset-top)+28px)]">
        <div className="mx-auto max-w-[480px]">
          <Link to="/" className="text-display text-white">
            Grovia
          </Link>
          <p className="mt-1 text-white/60">Fresh choices. Everyday.</p>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-[480px] px-5 pb-16">
        <div className="rounded-card bg-surface p-6 shadow-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
