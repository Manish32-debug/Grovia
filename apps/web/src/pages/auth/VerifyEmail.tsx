import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/api/endpoints/auth';
import { ApiClientError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('failed');
      setMessage('That link is incomplete. Open it straight from your email.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then((verified) => {
        // Keep the signed-in session in step with the new verified flag.
        if (accessToken) setSession({ user: verified, accessToken });
        setState('done');
      })
      .catch((err: unknown) => {
        setState('failed');
        setMessage(
          err instanceof ApiClientError ? err.message : 'That confirmation link did not work.',
        );
      });
  }, [token, accessToken, setSession]);

  if (state === 'working') {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (state === 'done') {
    return (
      <>
        <h1 className="text-h2">Email confirmed</h1>
        <p className="mt-2 text-text-2">Your account is ready. Start filling your basket.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Start shopping</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-h2">That link did not work</h1>
      <p className="mt-2 text-text-2">{message}</p>
      {user && (
        <Button
          variant="ghost"
          className="mt-6"
          onClick={() => void authApi.resendVerification()}
        >
          Send a new link
        </Button>
      )}
    </>
  );
}
