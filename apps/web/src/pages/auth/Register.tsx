import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '@grovia/shared';
import { authApi } from '@/api/endpoints/auth';
import { ApiClientError } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const update = (key: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit() {
    setFormError(null);
    const parsed = registerSchema.safeParse({
      ...form,
      phone: form.phone.trim() === '' ? undefined : form.phone,
    });

    if (!parsed.success) {
      setFieldErrors(
        Object.fromEntries(parsed.error.issues.map((i) => [i.path.join('.'), i.message])),
      );
      return;
    }

    setFieldErrors({});
    setPending(true);
    try {
      const session = await authApi.register(parsed.data);
      setSession(session);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="text-h2">Create your account</h1>
      <p className="mt-1 text-text-2">Groceries delivered in the slot you pick.</p>

      <div className="mt-6 space-y-4">
        <Input
          label="Name"
          autoComplete="name"
          value={form.name}
          onChange={(e) => update('name')(e.target.value)}
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => update('email')(e.target.value)}
          error={fieldErrors.email}
        />
        <Input
          label="Mobile number"
          inputMode="numeric"
          autoComplete="tel-national"
          value={form.phone}
          onChange={(e) => update('phone')(e.target.value)}
          error={fieldErrors.phone}
          hint="Optional. Used only for delivery updates."
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update('password')(e.target.value)}
          error={fieldErrors.password}
          hint="At least 10 characters, with a number."
        />

        {formError && (
          <p role="alert" className="rounded-tile bg-danger/10 px-4 py-3 text-caption text-danger">
            {formError}
          </p>
        )}

        <Button onClick={() => void handleSubmit()} loading={pending} className="w-full">
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </div>

      <p className="mt-5 text-caption text-text-2">
        Already have an account{' '}
        <Link to="/login" className="font-semibold text-grove-600">
          Sign in
        </Link>
      </p>
    </>
  );
}
