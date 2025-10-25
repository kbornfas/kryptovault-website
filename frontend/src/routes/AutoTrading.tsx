import { useEffect, useMemo, useRef, useState } from 'react';

type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d?: {
    price: number[];
  };
};

type AutoSessionStatus = 'idle' | 'running' | 'completed' | 'stopped';

type AutoSession = {
  status: AutoSessionStatus;
  runsTarget: number;
  runsCompleted: number;
  stake: number;
  startedAt: string;
  lastUpdated: string;
};

const COINGECKO_MARKETS_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h';

const DEFAULT_RUNS = 10;
const DEFAULT_STAKE = 500;

const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercentage = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return '—';
  }
  const formatted = value.toFixed(2);
  return `${value >= 0 ? '+' : ''}${formatted}%`;
};

const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);

const AutoTrading = () => {
  const [coins, setCoins] = useState<MarketCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState(DEFAULT_RUNS);
  const [stakeInput, setStakeInput] = useState(DEFAULT_STAKE.toString());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sessions, setSessions] = useState<Record<string, AutoSession>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const fetchCoins = async () => {
      setLoading(true);
      try {
        const response = await fetch(COINGECKO_MARKETS_URL);
        if (!response.ok) {
          throw new Error('Failed to load market data');
        }
        const data: MarketCoin[] = await response.json();
        setCoins(data);
        setError(null);
        if (data.length) {
          setSelectedIds((previous) =>
            previous.length ? previous : data.slice(0, Math.min(6, data.length)).map((coin) => coin.id),
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to fetch market data';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchCoins();
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timerId) => window.clearInterval(timerId));
      timersRef.current = {};
    };
  }, []);

  const stakeValue = useMemo(() => {
    const numeric = Number(stakeInput.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numeric)) {
      return 0;
    }
    return Number(numeric.toFixed(2));
  }, [stakeInput]);

  const isRunning = useMemo(
    () => Object.values(sessions).some((session) => session.status === 'running'),
    [sessions],
  );

  const disableStart = !selectedIds.length || runs < 1 || stakeValue <= 0 || isRunning;
  const disableStop = !isRunning;

  const toggleSelection = (coinId: string) => {
    setSelectedIds((prev) =>
      prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId],
    );
  };

  const selectAll = () => setSelectedIds(coins.map((coin) => coin.id));
  const clearAll = () => setSelectedIds([]);

  const clearTimer = (coinId: string) => {
    const timerId = timersRef.current[coinId];
    if (timerId) {
      window.clearInterval(timerId);
      delete timersRef.current[coinId];
    }
  };

  const startSessionForCoin = (coinId: string, runsTarget: number, stake: number) => {
    clearTimer(coinId);

    const intervalId = window.setInterval(() => {
      setSessions((previous) => {
        const current = previous[coinId];
        if (!current) {
          window.clearInterval(intervalId);
          delete timersRef.current[coinId];
          return previous;
        }

        if (current.status !== 'running') {
          window.clearInterval(intervalId);
          delete timersRef.current[coinId];
          return previous;
        }

        const runsCompleted = Math.min(current.runsTarget, current.runsCompleted + 1);
        const completed = runsCompleted >= current.runsTarget;
        const updated: AutoSession = {
          ...current,
          runsCompleted,
          status: completed ? 'completed' : 'running',
          lastUpdated: new Date().toISOString(),
        };

        const snapshot = { ...previous, [coinId]: updated };
        if (completed) {
          window.clearInterval(intervalId);
          delete timersRef.current[coinId];
        }
        return snapshot;
      });
    }, 2000 + Math.random() * 1500);

    timersRef.current[coinId] = intervalId;
    setSessions((previous) => ({
      ...previous,
      [coinId]: {
        status: 'running',
        runsTarget,
        runsCompleted: 0,
        stake,
        startedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    }));
  };

  const handleStart = () => {
    setStatusMessage(null);
    if (disableStart) {
      setStatusMessage('Select at least one asset and enter valid run and stake values to launch the robot.');
      return;
    }

    selectedIds.forEach((coinId) => startSessionForCoin(coinId, runs, stakeValue));
    setStatusMessage('Automation robot engaged. Progress will update live as each run completes.');
  };

  const handleStop = () => {
    Object.keys(timersRef.current).forEach((coinId) => clearTimer(coinId));
    setSessions((previous) => {
      const snapshot: Record<string, AutoSession> = { ...previous };
      Object.keys(snapshot).forEach((coinId) => {
        if (snapshot[coinId].status === 'running') {
          snapshot[coinId] = {
            ...snapshot[coinId],
            status: 'stopped',
            lastUpdated: new Date().toISOString(),
          };
        }
      });
      return snapshot;
    });
    setStatusMessage('Automation halted manually. Adjust your parameters and start again whenever you are ready.');
  };

  if (loading) {
    return (
      <section className="mx-auto flex max-w-5xl items-center justify-center px-6 py-24">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold text-red-300">Unable to load cryptocurrency catalogue</h2>
        <p className="mt-4 text-indigo-100/80">{error}. Please refresh the page to try again.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl space-y-10 px-6 py-10">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold">Automated Trading Control Center</h1>
        <p className="max-w-3xl text-lg text-indigo-100/80">
          Choose the cryptocurrencies you want the vault robot to trade, define how many execution runs to perform, set your
          stake per run, and monitor progress in real time. The robot completes all requested runs unless you stop it manually.
        </p>
      </header>

      <div className="rounded-2xl border border-white/10 bg-indigo-950/40 p-8 backdrop-blur-sm">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
                  Runs Per Asset
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={runs}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isNaN(value)) {
                      setRuns(DEFAULT_RUNS);
                      return;
                    }
                    setRuns(Math.max(1, Math.min(10_000, Math.floor(value))));
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-sm text-indigo-100/70">
                  Determines how many full buy/sell cycles the automation will execute per selected currency.
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
                  Stake Amount (USD)
                </label>
                <input
                  type="number"
                  min={50}
                  step={10}
                  value={stakeInput}
                  onChange={(event) => setStakeInput(event.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-sm text-indigo-100/70">
                  Funds allocated per run. The robot reinvests profits and stops only after completing all runs or when you
                  halt it manually.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-lg border border-purple-500/60 px-4 py-2 text-sm font-semibold text-purple-200 transition hover:bg-purple-600/20"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-indigo-100 transition hover:bg-white/10"
              >
                Clear Selection
              </button>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleStart}
              disabled={disableStart}
              className={`rounded-lg px-6 py-3 text-base font-semibold transition ${
                disableStart
                  ? 'bg-purple-900/40 text-purple-200/60'
                  : 'bg-purple-600 text-white hover:bg-purple-500'
              }`}
            >
              Start Robot
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={disableStop}
              className={`rounded-lg px-6 py-3 text-base font-semibold transition ${
                disableStop ? 'bg-slate-800 text-slate-300/60' : 'bg-red-600 text-white hover:bg-red-500'
              }`}
            >
              Stop Robot
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-6 rounded-lg border border-purple-500/30 bg-purple-600/10 px-4 py-3 text-sm text-purple-100">
            {statusMessage}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-indigo-950/40 p-6 backdrop-blur-sm">
        <h2 className="mb-6 text-2xl font-semibold">Cryptocurrency Catalogue</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coins.map((coin) => {
            const isSelected = selectedIds.includes(coin.id);
            const session = sessions[coin.id];
            const progressRatio = session ? session.runsCompleted / session.runsTarget : 0;
            const progressPercent = Math.min(100, Math.round(progressRatio * 100));

            return (
              <button
                key={coin.id}
                type="button"
                onClick={() => toggleSelection(coin.id)}
                className={`flex h-full flex-col rounded-xl border p-5 text-left transition hover:border-purple-400/70 hover:bg-purple-600/10 ${
                  isSelected ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-900/40' : 'border-white/10 bg-indigo-950/60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <img src={coin.image} alt={`${coin.name} logo`} className="h-10 w-10 rounded-full" />
                  <div>
                    <h3 className="text-xl font-bold">{coin.name}</h3>
                    <p className="text-sm text-indigo-200/70">{coin.symbol.toUpperCase()}</p>
                  </div>
                  <span
                    className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
                      isSelected ? 'bg-purple-500 text-white' : 'bg-white/10 text-indigo-100'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Tap to Select'}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-indigo-100/80">
                  <div className="flex justify-between">
                    <span className="font-semibold">Price</span>
                    <span>{formatCurrency(coin.current_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">24h Change</span>
                    <span className={coin.price_change_percentage_24h && coin.price_change_percentage_24h >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                      {formatPercentage(coin.price_change_percentage_24h)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Market Cap</span>
                    <span>{formatCompact(coin.market_cap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Volume</span>
                    <span>{formatCompact(coin.total_volume)}</span>
                  </div>
                </div>

                {session ? (
                  <div className="mt-5 space-y-2 rounded-lg border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-purple-100">
                    <div className="flex justify-between">
                      <span className="font-semibold">Runs</span>
                      <span>
                        {session.runsCompleted} / {session.runsTarget}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Stake</span>
                      <span>{formatCurrency(session.stake)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Status</span>
                      <span className="capitalize">{session.status}</span>
                    </div>
                    <div className="h-2 rounded-full bg-purple-500/20">
                      <div
                        className="h-full rounded-full bg-purple-400 transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-purple-200/70">
                      Updated {new Date(session.lastUpdated).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AutoTrading;
