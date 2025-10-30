import { useToast } from '@chakra-ui/react';
import { isAxiosError } from 'axios';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const FREQUENT_EXPIRY_THRESHOLD = 3;

type LocationState = {
  email?: string;
  verificationExpiresAt?: string;
  debugCode?: string;
};

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@');
  if (!domain) {
    return email;
  }
  const maskedLocal = localPart.length <= 2
    ? `${localPart[0] ?? ''}***`
    : `${localPart.slice(0, 2)}***${localPart.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
};

const formatExpiresIn = (expiresAt?: string) => {
  if (!expiresAt) {
    return null;
  }
  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) {
    return null;
  }
  const diffMs = expiryDate.getTime() - Date.now();
  if (diffMs <= 0) {
    return 'This code has expired. Request a fresh one below.';
  }
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) {
    return `Code expires in ${seconds}s`;
  }
  return `Code expires in ${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const VerifyEmail = () => {
  const { verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = (location.state ?? {}) as LocationState;
  const [email, setEmail] = useState(() => {
    const stateEmail = locationState.email;
    if (stateEmail && stateEmail.trim()) {
      return stateEmail.trim();
    }
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    return storedEmail ?? '';
  });
  const maskedEmail = email ? maskEmail(email) : 'your email inbox';
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [debugCode, setDebugCode] = useState(() => locationState.debugCode ?? (import.meta.env.DEV ? localStorage.getItem('pendingVerificationDebugCode') ?? undefined : undefined));
  const [expiresAt, setExpiresAt] = useState<string | undefined>(() => locationState.verificationExpiresAt ?? localStorage.getItem('pendingVerificationExpiresAt') ?? undefined);
  const [expiresLabel, setExpiresLabel] = useState<string | null>(() => formatExpiresIn(locationState.verificationExpiresAt ?? localStorage.getItem('pendingVerificationExpiresAt') ?? undefined));
  const [expiredCount, setExpiredCount] = useState(() => Number(localStorage.getItem('verificationExpiredCount') ?? '0') || 0);
  const toast = useToast();
  const lastExpiryNotifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!email) {
      navigate('/signup', { replace: true });
      return;
    }
    localStorage.setItem('pendingVerificationEmail', email);
  }, [email, navigate]);

  useEffect(() => {
    if (!expiresAt) {
      setExpiresLabel(null);
      lastExpiryNotifiedRef.current = null;
      return;
    }

    setExpiresLabel(formatExpiresIn(expiresAt));
    const timer = window.setInterval(() => {
      setExpiresLabel(formatExpiresIn(expiresAt));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt || !expiresLabel) {
      return;
    }

    const isExpiredMessage = expiresLabel.startsWith('This code has expired');
    if (!isExpiredMessage) {
      return;
    }

    if (lastExpiryNotifiedRef.current === expiresAt) {
      return;
    }

    lastExpiryNotifiedRef.current = expiresAt;
    const nextCount = expiredCount + 1;
    setExpiredCount(nextCount);
    localStorage.setItem('verificationExpiredCount', String(nextCount));
    setStatus('idle');
    setCode('');
    setError(null);
    setInfoMessage('This code expired. Request a fresh one to continue.');
    toast({
      title: 'Verification code expired',
      description: 'Request a new code and open the email when it arrives.',
      status: 'info',
      duration: 5000,
      isClosable: true,
    });

    if (nextCount >= FREQUENT_EXPIRY_THRESHOLD) {
      toast({
        title: 'Need help verifying your email?',
        description: `We notice codes keep expiring. Check spam for messages from support@kryptovault.com or contact us for assistance.`,
        status: 'warning',
        duration: 7000,
        isClosable: true,
      });
    }
  }, [expiresAt, expiresLabel, expiredCount, toast]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldown]);
  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(numeric);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setError('Enter the email you used to register.');
      return;
    }

    if (code.length !== CODE_LENGTH) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    try {
      setStatus('submitting');
      await verifyEmail(email.trim(), code);

      localStorage.removeItem('pendingVerificationEmail');
      localStorage.removeItem('pendingVerificationExpiresAt');
      localStorage.removeItem('verificationExpiredCount');
      setExpiredCount(0);
      if (import.meta.env.DEV) {
        localStorage.removeItem('pendingVerificationDebugCode');
        setDebugCode(undefined);
      }

      setStatus('success');
      setInfoMessage('Email verified! Redirecting to your dashboard...');
      setExpiresAt(undefined);
      setExpiresLabel(null);
      setCooldown(0);
      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
    } catch (cause) {
      setStatus('idle');
      let message = 'Unable to verify the code. Please try again.';

      if (isAxiosError<{ message?: string | string[]; verificationFailedAttempts?: number }>(cause)) {
        const payload = cause.response?.data;
        const description = payload?.message;
        if (Array.isArray(description) && description.length > 0) {
          message = description[0];
        } else if (typeof description === 'string' && description.trim()) {
          message = description;
        }

        if (typeof payload?.verificationFailedAttempts === 'number') {
          setExpiredCount(payload.verificationFailedAttempts);
          localStorage.setItem('verificationExpiredCount', String(payload.verificationFailedAttempts));
        }
      } else if (cause instanceof Error && cause.message.trim()) {
        message = cause.message;
      }

      setError(message);
    }
  };

  const handleResend = async () => {
    setError(null);
    setInfoMessage(null);

    if (!email.trim()) {
      setError('Enter the email you used to register.');
      return;
    }

    try {
      setCooldown(RESEND_COOLDOWN_SECONDS);
      const response = await resendVerification(email.trim());
      localStorage.setItem('pendingVerificationExpiresAt', response.verificationExpiresAt);
      setExpiresAt(response.verificationExpiresAt);
      setExpiresLabel(formatExpiresIn(response.verificationExpiresAt));
      if (import.meta.env.DEV && response.debugCode) {
        localStorage.setItem('pendingVerificationDebugCode', response.debugCode);
        setDebugCode(response.debugCode);
      }
      setInfoMessage(`A fresh verification code was sent to ${maskEmail(email.trim())}.`);
      setCode('');
      lastExpiryNotifiedRef.current = null;
      if (typeof response.verificationFailedAttempts === 'number') {
        setExpiredCount(response.verificationFailedAttempts);
        localStorage.setItem('verificationExpiredCount', String(response.verificationFailedAttempts));
      }
      toast({
        title: 'Verification code sent',
        description: `Check ${maskedEmail} for the latest code.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (cause) {
      setCooldown(0);
      let message = 'Unable to resend verification code. Please try again soon.';

      if (isAxiosError<{ message?: string | string[] }>(cause)) {
        const description = cause.response?.data?.message;
        if (Array.isArray(description) && description.length > 0) {
          message = description[0];
        } else if (typeof description === 'string' && description.trim()) {
          message = description;
        }
      } else if (cause instanceof Error && cause.message.trim()) {
        message = cause.message;
      }

      setError(message);
    }
  };

  return (
    <section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col justify-center px-6 py-16">
      <header className="mb-8 space-y-2 text-center">
        <h1 className="text-4xl font-bold">Verify Your Email</h1>
        <p className="text-lg text-indigo-100/80">
          We sent a 6-digit security code to <span className="font-semibold text-white">{maskedEmail}</span>. Enter it below to
          activate your vault.
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <p className="text-sm text-indigo-100/70">
              Double-check the spelling. You can update the email here if you made a typo during sign-up.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={handleCodeChange}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-center text-2xl tracking-[0.6em] text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="______"
              maxLength={CODE_LENGTH}
              autoComplete="one-time-code"
              required
            />
            <p className="text-sm text-indigo-100/70">Enter the 6 digits from the email we just sent.</p>
            {expiresLabel && (
              <p className="text-sm font-medium text-indigo-100/80">{expiresLabel}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={status === 'submitting'}
            className={`inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition ${
              status === 'submitting'
                ? 'cursor-not-allowed bg-purple-900/40 text-purple-200/60'
                : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            {status === 'submitting' ? 'Verifying…' : 'Confirm Email'}
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            className={`inline-flex items-center justify-center rounded-lg border px-6 py-3 text-base font-semibold transition ${
              cooldown > 0
                ? 'cursor-not-allowed border-white/10 text-indigo-200/50'
                : 'border-purple-400/60 text-purple-200 hover:border-purple-300 hover:text-white'
            }`}
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend Code'}
          </button>
        </div>

        {infoMessage && (
          <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {infoMessage}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {status === 'success' && !error && (
          <div className="mt-6 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {infoMessage}
          </div>
        )}

        {expiredCount >= FREQUENT_EXPIRY_THRESHOLD && (
          <div className="mt-6 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-4 text-sm text-orange-100">
            <p className="font-semibold text-orange-200">Still waiting on the email?</p>
            <p className="mt-1">
              We notice multiple codes have expired. Make sure messages from <span className="font-semibold">support@kryptovault.com</span> aren&apos;t in spam, and open the newest email as soon as it lands. You can also reach us directly at{' '}
              <a href="mailto:support@kryptovault.com" className="underline">support@kryptovault.com</a> for a manual verification assist.
            </p>
          </div>
        )}

        {import.meta.env.DEV && debugCode && (
          <div className="mt-6 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            <p className="font-semibold">Developer Shortcut</p>
            <p>Verification code: <span className="font-mono text-base">{debugCode}</span></p>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-2 text-sm text-indigo-100/80">
          <p>
            Didn’t receive the email? Check your spam folder or add <span className="font-semibold">support@kryptovault.com</span> to
            your contacts.
          </p>
          <p>
            Entered the wrong email? <Link to="/signup" className="text-purple-300 hover:text-purple-200">Sign up again</Link> using the correct address.
          </p>
        </div>
      </form>
    </section>
  );
};

export default VerifyEmail;
