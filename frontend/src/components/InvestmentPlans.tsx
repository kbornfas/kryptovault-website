import { API_ENDPOINTS } from '@/config/api';
import apiClient from '@/lib/apiClient';
import { useToast } from '@chakra-ui/react';
import { isAxiosError } from 'axios';
import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type ApiPlan = {
  id: string;
  name: string;
  description: string | null;
  minAmount: string | number;
  returnRate: string | number;
  duration: number;
  active: boolean;
};

type NormalizedPlan = {
  id: string;
  name: string;
  description: string;
  minAmount: number;
  returnRate: number;
  duration: number;
  color: string;
};

const colorPalette = ['bg-indigo-700', 'bg-purple-700', 'bg-pink-700', 'bg-emerald-700', 'bg-blue-700'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);

const fetchPlans = async (): Promise<ApiPlan[]> => {
  const response = await apiClient.get<ApiPlan[]>(`${API_ENDPOINTS.PLANS}`);
  return response.data;
};

export default function InvestmentPlans() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [modalPlan, setModalPlan] = useState<NormalizedPlan | null>(null);
  const [amountInput, setAmountInput] = useState('');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(['investmentPlans'], fetchPlans, {
    staleTime: 5 * 60 * 1000,
  });

  const plans = useMemo<NormalizedPlan[]>(() => {
    if (!data) {
      return [];
    }

    return data
      .filter((plan) => plan.active)
      .map((plan, index) => {
        const minAmount = typeof plan.minAmount === 'string' ? Number(plan.minAmount) : plan.minAmount;
        const returnRate = typeof plan.returnRate === 'string' ? Number(plan.returnRate) : plan.returnRate;

        return {
          id: plan.id,
          name: plan.name,
          description: plan.description ?? 'Investment plan',
          minAmount,
          returnRate,
          duration: plan.duration,
          color: colorPalette[index % colorPalette.length],
        };
      });
  }, [data]);

  const createInvestment = useMutation(
    (payload: { planId: string; amount: number }) =>
      apiClient.post(`${API_ENDPOINTS.INVESTMENTS}/create`, payload),
    {
      onSuccess: () => {
        toast({
          title: 'Investment created',
          description: 'Your funds are now allocated to this plan. Track progress from your portfolio overview.',
          status: 'success',
          duration: 6000,
          isClosable: true,
        });
        setModalPlan(null);
        setAmountInput('');
      },
      onError: (mutationError) => {
        const message = isAxiosError(mutationError)
          ? mutationError.response?.data?.message ?? mutationError.message
          : mutationError instanceof Error
            ? mutationError.message
            : 'We were unable to create the investment. Please try again.';
        toast({
          title: 'Unable to invest',
          description: message,
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
      },
    },
  );

  const handlePlanSelect = (plan: NormalizedPlan) => {
    localStorage.setItem('selectedPlan', plan.name);
    localStorage.setItem('selectedPlanId', plan.id);
    localStorage.setItem('selectedPlanName', plan.name);

    if (!user) {
      navigate('/signup');
      return;
    }

    setModalPlan(plan);
    setAmountInput(plan.minAmount.toString());
  };

  const closeModal = () => {
    setModalPlan(null);
    setAmountInput('');
    createInvestment.reset();
  };

  const handleInvestmentSubmit = () => {
    if (!modalPlan) {
      return;
    }

    const parsedAmount = Number(amountInput);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Enter a valid amount',
        description: 'Please provide a numeric investment amount greater than zero.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (parsedAmount < modalPlan.minAmount) {
      toast({
        title: 'Amount below minimum',
        description: `Minimum investment for ${modalPlan.name} is ${formatCurrency(modalPlan.minAmount)}.`,
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    createInvestment.mutate({ planId: modalPlan.id, amount: parsedAmount });
  };

  if (isLoading) {
    return (
      <section className="flex min-h-[240px] items-center justify-center bg-gradient-to-b from-black to-indigo-950 px-8 py-12">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white" aria-label="Loading plans" />
      </section>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : 'Unable to load investment plans right now.';
    return (
      <section className="bg-gradient-to-b from-black to-indigo-950 px-8 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center text-red-100">
          <h2 className="text-2xl font-semibold">We couldn&apos;t load the plans</h2>
          <p className="mt-3 text-sm text-red-100/80">{message}</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (!plans.length) {
    return (
      <section className="bg-gradient-to-b from-black to-indigo-950 px-8 py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-indigo-100">
          <h2 className="text-2xl font-semibold">No plans are available right now</h2>
          <p className="mt-3 text-sm text-indigo-100/80">
            Check back soon—our portfolio team may be refreshing the product line-up.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 bg-gradient-to-b from-black to-indigo-950 px-8 py-12 md:grid-cols-3">
      {plans.map((plan) => (
        <motion.button
          key={plan.id}
          type="button"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className={`flex h-full flex-col rounded-2xl p-6 text-left shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${plan.color}`}
          onClick={() => handlePlanSelect(plan)}
        >
          <div className="flex-grow">
            <h2 className="text-3xl font-bold text-white">{plan.name}</h2>
            <p className="mt-2 text-lg text-gray-100">{plan.returnRate}% Monthly Return</p>
            <p className="mt-3 text-sm text-gray-200/90">{plan.description}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-gray-100/70">Minimum Investment</p>
            <p className="text-lg font-semibold text-white">{formatCurrency(plan.minAmount)}</p>
            <p className="mt-3 text-xs uppercase tracking-wide text-gray-100/70">Lock-in Period</p>
            <p className="text-base font-semibold text-white">{plan.duration} days</p>
          </div>
          <span className="mt-6 inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100">
            {user ? 'Invest Now' : 'Get Started'}
          </span>
        </motion.button>
      ))}

      {modalPlan && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
        >
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-indigo-950/95 p-8 text-white shadow-2xl">
            <header className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-200/70">Confirm Investment</p>
                <h3 className="mt-1 text-3xl font-semibold">{modalPlan.name}</h3>
                <p className="mt-2 text-sm text-indigo-100/75">{modalPlan.description}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-white/10 px-3 py-1 text-sm text-indigo-100 transition hover:bg-white/10"
                disabled={createInvestment.isLoading}
              >
                Close
              </button>
            </header>

            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-200/70">Minimum Allocation</p>
                <p className="text-lg font-semibold">{formatCurrency(modalPlan.minAmount)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-200/70">Monthly Return</p>
                <p className="text-lg font-semibold">{modalPlan.returnRate}%</p>
              </div>
              <label className="block text-sm font-semibold uppercase tracking-wide text-indigo-200/80">
                Investment Amount (USD)
                <input
                  type="number"
                  min={modalPlan.minAmount}
                  step="0.01"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={modalPlan.minAmount.toString()}
                />
              </label>
            </div>

            <footer className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-indigo-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createInvestment.isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInvestmentSubmit}
                className="rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={createInvestment.isLoading}
              >
                {createInvestment.isLoading ? 'Allocating...' : 'Confirm Investment'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
