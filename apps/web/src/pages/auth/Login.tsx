import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema, Role } from '@grovia/shared';

import { authApi } from '@/api/endpoints/auth';
import { ApiClientError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type LoginMode = 'customer' | 'admin';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const [mode, setMode] =
    useState<LoginMode>('customer');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] =
    useState<Record<string, string>>({});
  const [formError, setFormError] =
    useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setFormError(null);

    const parsed = loginSchema.safeParse({
      email,
      password,
    });

    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [
            i.path.join('.'),
            i.message,
          ]),
        ),
      );
      return;
    }

    setFieldErrors({});
    setPending(true);

    try {
      const session = await authApi.login(parsed.data);

      const expectedRole =
        mode === 'admin'
          ? Role.ADMIN
          : Role.CUSTOMER;

      if (session.user.role !== expectedRole) {
        setFormError(
          mode === 'admin'
            ? 'This account is not an admin account.'
            : 'This account is not a customer account.',
        );
        return;
      }

      setSession(session);

      if (mode === 'admin') {
        navigate('/admin', { replace: true });
        return;
      }

      const from = (
        location.state as {
          from?: string;
        } | null
      )?.from;

      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : 'Something went wrong.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-h2">Sign in</h1>

      <p className="mt-1 text-text-2">
        Pick up where you left off.
      </p>

      <div className="mt-6">
        <p className="mb-2 text-caption font-semibold text-text-2">
          Continue as
        </p>

        <div className="grid grid-cols-2 gap-2 rounded-tile bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('customer');
              setFormError(null);
            }}
            className={[
              'rounded-lg px-4 py-3 text-sm font-semibold transition',
              mode === 'customer'
                ? 'bg-white text-grove-700 shadow-sm'
                : 'text-text-2 hover:text-ink',
            ].join(' ')}
          >
            Customer
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setFormError(null);
            }}
            className={[
              'rounded-lg px-4 py-3 text-sm font-semibold transition',
              mode === 'admin'
                ? 'bg-white text-grove-700 shadow-sm'
                : 'text-text-2 hover:text-ink',
            ].join(' ')}
          >
            Admin
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          error={fieldErrors.email}
          placeholder={
            mode === 'admin'
              ? 'admin@grovia.test'
              : 'you@example.com'
          }
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          onKeyDown={(e) =>
            e.key === 'Enter' &&
            void handleSubmit()
          }
          error={fieldErrors.password}
        />

        {formError && (
          <p
            role="alert"
            className="rounded-tile bg-danger/10 px-4 py-3 text-caption text-danger"
          >
            {formError}
          </p>
        )}

        <Button
          onClick={() => void handleSubmit()}
          loading={pending}
          className="w-full"
        >
          {pending
            ? 'Signing in…'
            : mode === 'admin'
              ? 'Enter Admin Portal'
              : 'Sign in'}
        </Button>
      </div>

      <div className="mt-5 flex items-center justify-between text-caption">
        <Link
          to="/forgot-password"
          className="text-text-2 underline underline-offset-2"
        >
          Forgot password
        </Link>

        {mode === 'customer' && (
          <Link
            to="/register"
            className="font-semibold text-grove-600"
          >
            Create an account
          </Link>
        )}
      </div>
    </>
  );
}