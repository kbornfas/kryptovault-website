import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import { useToast } from '@chakra-ui/react';
import { isAxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';

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

type AutomationSessionStatus = 'RUNNING' | 'STOPPED' | 'COMPLETED';

type AutomationSession = {
  id: string;
  userId: string;
  runsRequested: number;
  runsCompleted: number;
  stakePerRun: number;
  strategyPreset: string | null;
  currencies: string[];
  status: AutomationSessionStatus;
  startedAt: string;
  stoppedAt: string | null;
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

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

  const {
    data: automationSessions = [],
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    error: automationSessionsError,
    isFetching: isSessionsFetching,
  } = useQuery<AutomationSession[]>(
    ['automation-sessions'],
    async () => {
      const response = await apiClient.get<AutomationSession[]>(`${API_ENDPOINTS.AUTOMATION}/sessions`);
      return response.data;
    },
    {
      refetchInterval: 4_000,
      refetchIntervalInBackground: true,
      retry: (failureCount, error) => {
        if (isAxiosError(error) && error.response?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
    },
  );

  const coinById = useMemo(() => {
    const map: Record<string, MarketCoin> = {};
    coins.forEach((coin) => {
      map[coin.id] = coin;
    });
    return map;
  }, [coins]);

  const automationErrorMessage = useMemo(() => {
    if (!isSessionsError) {
      return null;
    }

    if (isAxiosError(automationSessionsError)) {
      if (automationSessionsError.response?.status === 401) {
        return 'Sign in again to resume monitoring automation runs.';
      }
      return automationSessionsError.response?.data?.message ?? automationSessionsError.message;
    }

    if (automationSessionsError instanceof Error) {
      return automationSessionsError.message;
    }

    return 'We were unable to sync automation sessions. Please try again.';
  }, [automationSessionsError, isSessionsError]);

  const sessionsBySymbol = useMemo(() => {
    const map: Record<string, AutomationSession> = {};
    automationSessions.forEach((session) => {
      session.currencies.forEach((currency) => {
        const symbol = currency.toUpperCase();
        const existing = map[symbol];
        if (!existing || new Date(session.startedAt).getTime() > new Date(existing.startedAt).getTime()) {
          map[symbol] = session;
        }
      });
    });
    return map;
  }, [automationSessions]);

  const runningSessions = useMemo(
    () => automationSessions.filter((session) => session.status === 'RUNNING'),
    [automationSessions],
  );

  const startAutomationMutation = useMutation(
    (payload: { currency: string; runs: number; stakePerRun: number }) =>
      apiClient.post(`${API_ENDPOINTS.AUTOMATION}/start`, {
        runs: payload.runs,
        currencies: [payload.currency],
        stakePerRun: payload.stakePerRun,
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['automation-sessions']);
      },
    },
  );

  const stopAutomationMutation = useMutation(
    (sessionId: string) => apiClient.post(`${API_ENDPOINTS.AUTOMATION}/stop`, { sessionId }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['automation-sessions']);
      },
    },
  );

  const stakeValue = useMemo(() => {
    const numeric = Number(stakeInput.replace(/[^0-9.]/g, ''));
    if (Number.isNaN(numeric)) {
      return 0;
    }
    return Number(numeric.toFixed(2));
  }, [stakeInput]);

  const isRunning = runningSessions.length > 0;
  const startInFlight = startAutomationMutation.isLoading;
  const stopInFlight = stopAutomationMutation.isLoading;

  const disableStart =
    !selectedIds.length || runs < 1 || stakeValue <= 0 || isRunning || startInFlight || stopInFlight;
  const disableStop = !isRunning || startInFlight || stopInFlight;

  const toggleSelection = (coinId: string) => {
    setSelectedIds((prev) =>
      prev.includes(coinId) ? prev.filter((id) => id !== coinId) : [...prev, coinId],
    );
  };

  const selectAll = () => setSelectedIds(coins.map((coin) => coin.id));
  const clearAll = () => setSelectedIds([]);

  const handleStart = async () => {
    setStatusMessage(null);
    if (disableStart) {
      setStatusMessage('Select at least one asset and enter valid run and stake values to launch the robot.');
      return;
    }

    try {
      for (const coinId of selectedIds) {
        const coin = coinById[coinId];
        if (!coin) {
          continue;
        }

        await startAutomationMutation.mutateAsync({
          currency: coin.symbol.toUpperCase(),
          runs,
          stakePerRun: stakeValue,
        });
      }

      const successMessage =
        'Automation robot engaged. Progress will update live as each run completes.';
      setStatusMessage(successMessage);
      toast({
        title: 'Automation started',
        description: successMessage,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      const description = isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : error instanceof Error
          ? error.message
          : 'We were unable to start the automation. Please try again.';
      toast({
        title: 'Unable to start automation',
        description,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    }
  };

  const handleStop = async () => {
    setStatusMessage(null);

    if (!runningSessions.length) {
      setStatusMessage('No automation cycles are currently running.');
      return;
    }

    try {
      for (const session of runningSessions) {
        await stopAutomationMutation.mutateAsync(session.id);
      }

      const message =
        'Automation halted manually. Adjust your parameters and start again whenever you are ready.';
      setStatusMessage(message);
      toast({
        title: 'Automation stopped',
        description: message,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      const description = isAxiosError(error)
        ? error.response?.data?.message ?? error.message
        : error instanceof Error
          ? error.message
          : 'We were unable to stop the automation run. Please try again.';
      toast({
        title: 'Unable to stop automation',
        description,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-6 py-10">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-white/40 hover:text-white"
        >
          <span className="text-lg font-semibold">&lt;-</span>
          <span>Back</span>
        </button>
        <div className="mt-24 flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-4xl px-6 py-10">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-white/40 hover:text-white"
        >
          <span className="text-lg font-semibold">&lt;-</span>
          <span>Back</span>
        </button>
        <div className="mt-16 text-center">
          <h2 className="text-3xl font-semibold text-red-300">Unable to load cryptocurrency catalogue</h2>
          <p className="mt-4 text-indigo-100/80">{error}. Please refresh the page to try again.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <button
        type="button"
        onClick={handleBack}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-indigo-100 transition hover:border-white/40 hover:text-white"
      >
        <span className="text-lg font-semibold">&lt;-</span>
        <span>Back</span>
      </button>
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
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">Cryptocurrency Catalogue</h2>
          <div className="text-xs text-indigo-200/70">
            {isSessionsLoading || isSessionsFetching ? 'Syncing automation telemetry…' : 'Automation telemetry up to date.'}
          </div>
        </div>

        {automationErrorMessage && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
            {automationErrorMessage}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coins.map((coin) => {
            const isSelected = selectedIds.includes(coin.id);
            const session = sessionsBySymbol[coin.symbol.toUpperCase()];
            const progressRatio = session ? session.runsCompleted / session.runsRequested : 0;
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
                        {session.runsCompleted} / {session.runsRequested}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Stake</span>
                      <span>{formatCurrency(session.stakePerRun)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Status</span>
                      <span className="capitalize">{session.status.toLowerCase()}</span>
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
