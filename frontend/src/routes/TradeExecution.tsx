import { ArrowRight, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

const formatTimestamp = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

type MarketCoin = {
  id: string;
  name: string;
  symbol: string;
  image?: string;
  current_price: number;
  price_change_percentage_24h: number | null;
};

type TradeExecutionState = {
  action: 'buy' | 'sell' | 'auto';
  coin: MarketCoin;
  initiatedAt: string;
  availableBalance?: number;
};

type TradeStep = {
  title: string;
  description: string;
};

const actionLabels: Record<TradeExecutionState['action'], string> = {
  buy: 'Manual Buy Order',
  sell: 'Manual Sell Order',
  auto: 'Automated Strategy Run',
};

const TradeExecution = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as TradeExecutionState | undefined;

  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
    }
  }, [navigate, state]);

  const [activeStep, setActiveStep] = useState(0);

  const steps = useMemo<TradeStep[]>(() => {
    if (!state) {
      return [];
    }

    if (state.action === 'auto') {
      return [
        {
          title: 'Robot Calibrating',
          description: 'Evaluating volatility bands and liquidity depth for optimal cycle sizing.',
        },
        {
          title: 'Cycle Execution',
          description: 'Deploying layered entries and protective exits across partner venues.',
        },
        {
          title: 'Profit Allocation',
          description: 'Reconciling realized gains back into your insured vault balance.',
        },
        {
          title: 'Report Published',
          description: 'Compiling full execution report and notifying treasury desk.',
        },
      ];
    }

    return [
      {
        title: 'Order Initiated',
        description: 'Vault control room received your order ticket and locked reference pricing.',
      },
      {
        title: 'Risk Checks',
        description: 'Verifying funding capacity, compliance rules, and venue connectivity.',
      },
      {
        title: 'Exchange Routing',
        description: 'Splitting order across deep-liquidity venues for best execution guarantee.',
      },
      {
        title: 'Settlement Posted',
        description: 'Trade settled and ledger updated with notarized transaction hash.',
      },
    ];
  }, [state]);

  useEffect(() => {
    if (!steps.length) {
      return;
    }

    setActiveStep(0);
    const timers: number[] = [];

    steps.forEach((_, index) => {
      const timerId = window.setTimeout(() => {
        setActiveStep(index);
      }, index * 2200);
      timers.push(timerId);
    });

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [steps]);

  if (!state) {
    return null;
  }

  const { coin, action, initiatedAt, availableBalance } = state;
  const isAuto = action === 'auto';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <header className="mb-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 inline-flex items-center gap-2 text-sm text-indigo-200 hover:text-indigo-100 transition"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back
          </button>
          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-indigo-500/10 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {coin.image ? (
                  <img src={coin.image} alt={`${coin.name} logo`} className="h-16 w-16 rounded-2xl border border-white/10" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl border border-white/10 bg-indigo-500/20" />
                )}
                <div>
                  <p className="text-sm uppercase tracking-[0.4em] text-indigo-200/70">{actionLabels[action]}</p>
                  <h1 className="mt-1 text-4xl font-black tracking-tight">
                    {coin.name}
                    <span className="ml-3 text-lg font-semibold text-indigo-200/80">({coin.symbol.toUpperCase()})</span>
                  </h1>
                </div>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-sm text-indigo-200/70">Initiated</span>
                <span className="text-xl font-semibold">{formatTimestamp(initiatedAt)}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-indigo-200/60">Reference Price</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(coin.current_price)}</p>
                <p className="mt-1 text-xs text-indigo-200/70">Snapshot captured at order entry</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-indigo-200/60">24h Change</p>
                <p className={`mt-2 text-2xl font-semibold ${
                  (coin.price_change_percentage_24h ?? 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'
                }`}>
                  {coin.price_change_percentage_24h?.toFixed(2) ?? '0.00'}%
                </p>
                <p className="mt-1 text-xs text-indigo-200/70">Helps calibrate spread protection</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-wide text-indigo-200/60">Vault Allocation</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(availableBalance ?? 0)}</p>
                <p className="mt-1 text-xs text-indigo-200/70">Funds verified before routing</p>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-indigo-50">Live Execution Timeline</h2>
          <p className="mt-2 text-indigo-200/70">
            Our desk streams each checkpoint in real time so you can audit the full trade lifecycle.
          </p>
          <div className="mt-8 grid gap-6">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;

              return (
                <div
                  key={step.title}
                  className={`flex items-start gap-4 rounded-2xl border p-6 transition ${
                    isCompleted
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : isActive
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-300" />
                    ) : (
                      <Clock className="h-6 w-6 text-indigo-200/50" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-indigo-200/75">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-indigo-500/10">
          <h2 className="text-2xl font-semibold text-indigo-50">What happens next?</h2>
          <p className="mt-2 text-indigo-200/70">
            {isAuto
              ? 'Once the automation cycle completes, your vault ledger and notification center will reflect realized results.'
              : 'Upon settlement you can review the notarized transaction hash and P/L statement inside your trade journal.'}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/50 bg-indigo-500/15 px-5 py-3 text-sm font-semibold text-indigo-100 transition hover:bg-indigo-500/25"
              onClick={() => navigate('/trade-history')}
            >
              View Trade History
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-indigo-100 transition hover:bg-white/10"
              onClick={() => navigate('/')}
            >
              Return to Dashboard
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TradeExecution;
