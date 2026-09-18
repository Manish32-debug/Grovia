import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/endpoints/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

export function AccountPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <section className="mt-6">
      <h1 className="text-display">{user.name}</h1>
      <p className="mt-1 text-text-2">{user.email}</p>

      <dl className="mt-6 rounded-card bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <dt className="text-text-2">Role</dt>
          <dd className="font-semibold">
            {user.role.toLowerCase().replace('_', ' ')}
          </dd>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <dt className="text-text-2">Email</dt>
          <dd className="flex items-center gap-2 font-semibold">
            <span
              className={`size-2 rounded-full ${
                user.emailVerified ? 'bg-grove-500' : 'bg-amber'
              }`}
              aria-hidden
            />
            {user.emailVerified ? 'Confirmed' : 'Not confirmed'}
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => navigate('/orders')}
        className="mt-4 flex w-full items-center justify-between rounded-card bg-surface p-5 text-left shadow-card transition hover:shadow-md"
      >
        <div>
          <p className="font-semibold">Order History</p>
          <p className="mt-1 text-sm text-text-2">
            View your previous orders and track deliveries
          </p>
        </div>

        <span className="text-xl text-text-2">›</span>
      </button>

      {!user.emailVerified && (
        <div className="mt-4 rounded-card bg-grove-50 p-5">
          <p className="text-text-2">
            Confirm your email so we can send order updates. In development
            the link is printed in the API log.
          </p>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => void authApi.resendVerification()}
          >
            Send the link again
          </Button>
        </div>
      )}

      <Button
        variant="ghost"
        className="mt-6"
        onClick={() => void signOut().then(() => navigate('/login'))}
      >
        Sign out
      </Button>
    </section>
  );
}