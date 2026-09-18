import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@grovia/shared';
import { useAuthStore } from '@/store/authStore';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * UX only. Every protected endpoint re-checks authentication and ownership on
 * the server; hiding a route here just avoids showing a screen that would fail.
 */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, ready } = useAuthStore();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <Outlet />;
}
