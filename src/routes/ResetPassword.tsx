import { FormEvent, useState } from 'react';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = email.trim();

    if (!emailPattern.test(trimmed)) {
      setStatus('error');
      setMessage('Enter a valid email so we can send your reset link.');
      return;
    }

    setStatus('success');
    setMessage(
      'If an account exists for this email, a secure reset link has been dispatched. Check your inbox for next steps.',
    );
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 py-16">
      <header className="mb-8 text-center space-y-2">
        <h1 className="text-4xl font-bold">Reset Your Password</h1>
        <p className="text-lg text-indigo-100/80">
          Enter the email address linked to your KryptoVault account and we&rsquo;ll send you a password reset link.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-indigo-950/50 p-10 shadow-lg backdrop-blur-sm"
      >
        <div className="space-y-6">
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

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-purple-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-purple-500"
          >
            Send Reset Link
          </button>
          <p className="text-sm text-indigo-100/70">
            Need additional help? Contact our 24/7 vault support team at support@kryptovault.com.
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
          </div>
        )}
      </form>
    </section>
  );
};

export default ResetPassword;
