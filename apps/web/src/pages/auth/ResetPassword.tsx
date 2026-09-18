import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { passwordSchema } from '@grovia/shared';
import { authApi } from '@/api/endpoints/auth';
import { ApiClientError } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <>
        <h1 className="text-h2">This link is incomplete</h1>
        <p className="mt-2 text-text-2">
          Open the link straight from your email, or request a new one.
        </p>
        <Link to="/forgot-password" className="mt-6 inline-block">
          <Button variant="ghost">Request a new link</Button>
        </Link>
      </>
    );
  }

  async function handleSubmit() {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);

    setError(undefined);
    setFormError(null);
    setPending(true);
    try {
      await authApi.resetPassword({ token, password: parsed.data });
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-h2">Set a new password</h1>
      <p className="mt-1 text-text-2">
        Every device signed in to this account will be signed out.
      </p>

      <div className="mt-6 space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
          error={error}
          hint="At least 10 characters, with a number."
        />

        {formError && (
          <p role="alert" className="rounded-tile bg-danger/10 px-4 py-3 text-caption text-danger">
            {formError}
          </p>
        )}

        <Button onClick={() => void handleSubmit()} loading={pending} className="w-full">
          {pending ? 'Updating…' : 'Update password'}
        </Button>
      </div>
    </>
  );
}
