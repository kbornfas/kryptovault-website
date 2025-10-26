import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import { useQuery } from 'react-query';

interface TradeHistoryEntry {
  id: string;
  symbol: string;
  action: string;
  strategy: string;
  status: string;
  price: string | number;
  size: string | number;
  result: string | number | null;
  notes: string | null;
  createdAt: string;
}

const formatCurrency = (value: string | number | null | undefined) => {
  const numeric = value === null || value === undefined ? 0 : Number(value);

  if (Number.isNaN(numeric)) {
    return value ?? '—';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(numeric);
};

const formatDateTime = (value: string) => {
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

const TradeHistory = () => {
  const {
    data: trades = [],
    isLoading,
    isError,
  } = useQuery<TradeHistoryEntry[]>(
    ['trade-history'],
    async () => {
      const response = await apiClient.get<TradeHistoryEntry[]>(`${API_ENDPOINTS.TRADES}/history`);
      return response.data;
    },
    {
      staleTime: 20_000,
    },
  );

  if (isLoading) {
    return (
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex justify-center items-center h-40">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent"></div>
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="max-w-4xl mx-auto px-6 py-16 text-center text-red-300">
        <h2 className="text-2xl font-semibold mb-4">Unable to load trade history</h2>
        <p>Please try again in a moment.</p>
      </section>
    );
  }

  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Trade History</h1>
        <p className="text-lg text-indigo-200/80">
          Review all of your trading activity, including manual and automated executions.
        </p>
      </header>

      {trades.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-indigo-950/50 p-10 text-center">
          <p className="text-lg text-indigo-100/70">No trades recorded yet. Once trades execute, they will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-indigo-950/50 shadow-lg backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr className="text-left text-xs uppercase tracking-wider text-indigo-100/70">
                  <th className="px-6 py-4">Symbol</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Strategy</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Size</th>
                  <th className="px-6 py-4">Result</th>
                  <th className="px-6 py-4">Executed</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-indigo-50">
                {trades.map((trade) => (
                  <tr key={trade.id} className="hover:bg-purple-900/20 transition-colors">
                    <td className="px-6 py-4 font-semibold">{trade.symbol || '—'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          trade.action === 'BUY' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {trade.action || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-200">
                        {trade.strategy || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-500/20 px-3 py-1 text-xs font-semibold text-slate-200">
                        {trade.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{formatCurrency(trade.price)}</td>
                    <td className="px-6 py-4">{formatCurrency(trade.size)}</td>
                    <td className="px-6 py-4">
                      {trade.result !== null && trade.result !== undefined
                        ? formatCurrency(trade.result)
                        : 'Pending'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(trade.createdAt)}</td>
                    <td className="px-6 py-4 max-w-xs truncate" title={trade.notes ?? undefined}>
                      {trade.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default TradeHistory;
