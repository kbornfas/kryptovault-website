import { PasswordResetError, useAuth } from '@/context/AuthContext';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const tokenPattern = /^[a-f0-9]{40,128}$/i;
const escalationThreshold = 3;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { response?: { data?: { message?: string } }; message?: string };
    const responseMessage = maybeError.response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage;
    }
    if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
      return maybeError.message;
    }
  }

  return fallback;
};

const ResetPasswordConfirm = () => {
  const { completePasswordReset } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetAttempts, setResetAttempts] = useState<number | null>(null);
  const [requiresNewToken, setRequiresNewToken] = useState(false);

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const nextEmail = searchParams.get('email');
    const nextToken = searchParams.get('token');

    if (nextEmail !== null) {
      setEmail(nextEmail);
    }

    if (nextToken !== null) {
      setToken(nextToken);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedToken = token.trim();

    if (!trimmedEmail) {
      setStatus('error');
      setMessage('Enter the email associated with your account.');
      return;
    }

    if (!tokenPattern.test(trimmedToken)) {
      setStatus('error');
      setMessage('Enter the reset token you received.');
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setMessage('Choose a password with at least 8 characters for better security.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords must match before we can reset them.');
      return;
    }

    try {
      setIsSubmitting(true);
      await completePasswordReset(trimmedEmail, trimmedToken, password);
      setStatus('success');
  setMessage('Password updated successfully. Redirecting to your dashboard...');
  setResetAttempts(null);
  setRequiresNewToken(false);

      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }

      redirectTimer.current = setTimeout(() => {
        navigate('/', { replace: true });
      }, 1800);
    } catch (error) {
      setStatus('error');
      if (error instanceof PasswordResetError) {
        setResetAttempts(error.attempts ?? null);
        setRequiresNewToken(Boolean(error.requiresNewToken));
        setMessage(error.message);
      } else {
        setResetAttempts(null);
        setRequiresNewToken(false);
        setMessage(
          getErrorMessage(
            error,
            'We could not reset your password. Double-check the token and try again.',
          ),
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-16">
      <header className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-bold">Confirm Password Reset</h1>
        <p className="text-lg text-indigo-100/80">
          Enter the token we emailed you along with your new password to secure your account.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-indigo-950/50 p-10 shadow-lg backdrop-blur-sm"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="token" className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
              Reset Token
            </label>
            <input
              id="token"
              name="token"
              type="text"
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Paste your reset token"
              autoComplete="one-time-code"
            />
            <p className="text-xs text-indigo-100/70">Tokens expire quickly, so complete this step as soon as possible.</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Create a strong password"
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Re-enter your new password"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
          <p className="text-sm text-indigo-100/70">
            If this wasn&rsquo;t you, secure your account immediately by reaching out to support@kryptovault.com.
          </p>
        </div>

        {status !== 'idle' && (
          <div
            className={`mt-6 rounded-lg border px-4 py-3 text-sm ${
              status === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                : 'border-red-500/40 bg-red-500/10 text-red-200'
            }`}
          >
            {message}
            {status === 'error' && requiresNewToken && (
              <span className="mt-2 block text-xs text-indigo-100/70">
                Need a fresh link? Return to the{' '}
                <Link to="/reset-password" className="font-semibold underline">
                  password reset request
                </Link>{' '}
                page to start again.
              </span>
            )}
            {status === 'error' && resetAttempts !== null && resetAttempts >= escalationThreshold && (
              <span className="mt-2 block text-xs text-indigo-100/70">
                Having trouble after multiple attempts? Contact{' '}
                <a href="mailto:support@kryptovault.com" className="font-semibold underline">
                  support@kryptovault.com
                </a>{' '}
                for direct assistance.
              </span>
            )}
          </div>
        )}
      </form>
    </section>
  );
};

export default ResetPasswordConfirm;
