import { useState } from 'react';
import { Link } from 'react-router-dom';
import { emailSchema } from '@grovia/shared';
import { authApi } from '@/api/endpoints/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);

    setError(undefined);
    setPending(true);
    try {
      await authApi.forgotPassword(parsed.data);
      setSent(true);
    } catch {
      // The endpoint answers identically for known and unknown addresses, so
      // there is nothing useful to report except a transport failure.
      setSent(true);
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="text-h2">Check your email</h1>
        <p className="mt-2 text-text-2">
          If that address has a Grovia account, a reset link is on its way. It works for 30 minutes.
        </p>
        <Link to="/login" className="mt-6 inline-block">
          <Button variant="ghost">Back to sign in</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-h2">Reset your password</h1>
      <p className="mt-1 text-text-2">We will email you a link to set a new one.</p>

      <div className="mt-6 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
          error={error}
        />
        <Button onClick={() => void handleSubmit()} loading={pending} className="w-full">
          {pending ? 'Sending…' : 'Send reset link'}
        </Button>
      </div>
    </>
  );
}
