import {
    ArrowDownRight,
    ArrowUpRight,
    BadgeCheck,
    BarChart3,
    ChevronRight,
    Copy,
    Globe,
    KeyRound,
    Lock,
    LogOut,
    Mail,
    Menu,
    Shield,
    Star,
    TrendingUp,
    User,
    Wallet,
    X,
    Zap
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type CryptoTab = 'bitcoin' | 'ethereum' | 'solana';

type CryptoMeta = {
  price: number;
  change: number;
};

type MarketCoin = {
  id: string;
  name: string;
  symbol: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
  market_cap: number;
  total_volume: number;
  sparkline_in_7d?: {
    price: number[];
  };
};

type SignupFormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisteredProfile = {
  fullName: string;
  email: string;
  password: string;
};

type SimulationPoint = {
  price: number;
  direction: 'buy' | 'sell';
};

type TradeExecution = {
  id: string;
  coinId: string;
  symbol: string;
  action: 'buy' | 'sell';
  price: number;
  size: number;
  status: 'executed' | 'closed';
  timestamp: string;
  strategy: 'manual' | 'auto';
  notes: string;
  result?: number;
};

type ActivePanel = 'market' | 'features' | 'security' | 'deposit' | 'withdraw';

const heroDefaults: Record<CryptoTab, CryptoMeta> = {
  bitcoin: { price: 110031.02, change: 0 },
  ethereum: { price: 3456.78, change: 3.12 },
  solana: { price: 142.9, change: -1.45 },
};

const fallbackCoinMeta: Record<CryptoTab, { name: string; symbol: string; image: string }> = {
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
  },
  solana: {
    name: 'Solana',
    symbol: 'SOL',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png?1696504756',
  },
};

const createFallbackCoin = (id: CryptoTab, meta: CryptoMeta): MarketCoin => {
  const info = fallbackCoinMeta[id];
  const basePrice = meta.price;
  const syntheticSeries = Array.from({ length: 48 }, (_, index) => {
    const wave = Math.sin(index / 4) * (basePrice * 0.005);
    const drift = index * (meta.change / 100) * (basePrice * 0.002);
    return basePrice + wave + drift;
  });

  return {
    id,
    name: info.name,
    symbol: info.symbol,
    image: info.image,
    current_price: basePrice,
    price_change_percentage_24h: meta.change,
    market_cap: basePrice * 1_000_000,
    total_volume: basePrice * 80_000,
    sparkline_in_7d: { price: syntheticSeries },
  };
};

const resolveDepositAsset = (coin: MarketCoin): DepositAssetKey => {
  const symbol = coin.symbol.toLowerCase();
  if (symbol.includes('btc')) {
    return 'btc';
  }
  if (symbol.includes('eth')) {
    return 'eth';
  }
  if (symbol.includes('sol')) {
    return 'sol';
  }
  return 'usdt';
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

const formatCompact = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);

const DEMO_INITIAL_CAPITAL = 10_000;

const TRADE_JOURNAL_STORAGE_KEY = 'kv-trade-journal';

const DEPOSIT_ADDRESSES = {
  usdt: 'TVKQpGsENufZDfB1ipVVjzt7KvXzhRez43',
  btc: 'bc1qrusm3z726dcszfx6e7nk4pad8h0ygeyy0zj389',
  eth: '0xE8cc2526380dE929596B9267304B89A25fc98A36',
  sol: 'GAU9RczYqHz6eJWgTRApGPoWFk7krEEeZjjZJH3dUHdG',
  card: 'Secure Card Checkout → https://pay.kryptovault.com/checkout',
  wire: 'Beneficiary: KryptoVault Holdings LLC | Bank: Silvergate Bank | Account: 987654321 | SWIFT: SIGLUS44 | Reference: Your Vault ID',
} as const;

const DEMO_WALLET_ADDRESS = DEPOSIT_ADDRESSES.usdt;

type DepositAssetKey = keyof typeof DEPOSIT_ADDRESSES;

const DEPOSIT_ORDER: DepositAssetKey[] = ['usdt', 'btc', 'eth', 'sol', 'card', 'wire'];

const DEPOSIT_METADATA: Record<DepositAssetKey, { label: string; network: string; description: string; note: string }> = {
  usdt: {
    label: 'USDT • Tether (TRC-20)',
    network: 'Tron TRC-20',
    description: 'Stablecoin onboarding for instant credit to your vault. Recommended for funding automated strategies.',
    note: 'Minimum deposit $500. Zero-fee internal crediting within 60 seconds.',
  },
  btc: {
    label: 'BTC • Bitcoin',
    network: 'Bitcoin Mainnet',
    description: 'Perfect for long-term storage with cold vault segregation and instant hedging availability.',
    note: 'Network fees apply. Funds settle after 2 confirmations.',
  },
  eth: {
    label: 'ETH • Ethereum',
    network: 'Ethereum Mainnet',
    description: 'Access DeFi yields, staking, and smart-trade routing with lightning execution through our vault.',
    note: 'Network fees apply. Funds settle after 20 confirmations.',
  },
  sol: {
    label: 'SOL • Solana',
    network: 'Solana Mainnet',
    description: 'Ultra-low latency network for high-frequency strategies and index rebalancing.',
    note: 'Minimum deposit $500. Instant availability once detected on-chain.',
  },
  card: {
    label: 'Card Checkout',
    network: 'Visa / Mastercard / Amex',
    description: 'Top up instantly with your credit or debit card via our PCI-DSS compliant processor.',
    note: '3-D Secure required. Funds appear in your vault immediately after authorization.',
  },
  wire: {
    label: 'Bank Wire Transfer',
    network: 'SWIFT • SEPA',
    description: 'Ideal for high-value deposits through traditional banking rails with treasury monitoring.',
    note: 'Include your Vault ID in the payment reference for expedited crediting.',
  },
};

type WithdrawalMethod = DepositAssetKey;

type WithdrawalFormState = {
  amount: string;
  destination: string;
};

const WITHDRAWAL_OPTIONS: Record<WithdrawalMethod, { label: string; description: string; placeholder: string }> = {
  usdt: {
    label: 'USDT (TRC-20)',
    description: 'Fastest stablecoin payouts with minimal network fees.',
    placeholder: 'Enter your TRC-20 USDT wallet address',
  },
  btc: {
    label: 'Bitcoin (BTC)',
    description: 'Route profits directly to your primary Bitcoin cold wallet.',
    placeholder: 'Paste your BTC address',
  },
  eth: {
    label: 'Ethereum (ETH)',
    description: 'Leverage ERC-20 compatibility for DeFi deployments.',
    placeholder: 'Enter your Ethereum wallet address',
  },
  sol: {
    label: 'Solana (SOL)',
    description: 'Ultra-fast settlement to your Solana wallet for on-chain strategies.',
    placeholder: 'Provide your Solana address',
  },
  card: {
    label: 'Credit / Debit Card',
    description: 'Send profits back to the card used for funding with instant settlement.',
    placeholder: 'Enter card issuer, name on card, and last 4 digits',
  },
  wire: {
    label: 'Bank Wire',
    description: 'Traditional banking rails for corporate treasury or high-limit withdrawals.',
    placeholder: 'Bank name, account number / IBAN, SWIFT or routing code',
  },
};

const securityHighlights = [
  {
    title: 'Institutional Custody',
    detail: '98% of client assets stored in geographically distributed cold vaults with biometric access controls.',
    icon: Shield,
  },
  {
    title: '24/7 Risk Engine',
    detail: 'AI-driven surveillance monitors liquidity pools, exchange venues, and on-chain anomalies in real time.',
    icon: Lock,
  },
  {
    title: 'Regulatory Compliance',
    detail: 'SOC 2 Type II audited controls, KYC/AML alignment, and proactive penetration testing every quarter.',
    icon: BadgeCheck,
  },
  {
    title: 'Insurance Coverage',
  detail: "$500M crime insurance through Lloyd's syndicates covering theft, insider risk, and smart contract failure.",
    icon: KeyRound,
  },
];

const depositSteps = [
  'Choose the asset and confirm the matching network before sending funds.',
  'Transfer at least $500 to activate smart-trade automation and risk controls.',
  'Funds appear in your vault wallet automatically after confirmations.',
];

const features = [
  { icon: Shield, title: 'Bank-Grade Security', desc: 'Multi-layer encryption and cold storage protection' },
  { icon: Zap, title: 'Instant Trading', desc: 'Execute trades in milliseconds with zero lag' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Professional-grade charts and market insights' },
  { icon: Wallet, title: 'Multi-Asset Wallet', desc: 'Store and manage 100+ cryptocurrencies' },
  { icon: Globe, title: 'Global Access', desc: 'Trade 24/7 from anywhere in the world' },
  { icon: Lock, title: '2FA Protection', desc: 'Enhanced account security with biometric options' },
];

const stats = [
  { value: '$2.4B+', label: 'Assets Under Management' },
  { value: '500K+', label: 'Active Traders' },
  { value: '150+', label: 'Supported Assets' },
  { value: '99.9%', label: 'Uptime Guaranteed' },
];

const SPARKLINE_WIDTH = 80;
const SPARKLINE_HEIGHT = 28;

const generateSparklinePath = (values: number[]): string => {
  if (!values?.length) {
    return '';
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const denominator = Math.max(values.length - 1, 1);

  return values
    .map((value, index) => {
      const x = (index / denominator) * SPARKLINE_WIDTH;
      const y = SPARKLINE_HEIGHT - ((value - min) / range) * SPARKLINE_HEIGHT;
      const command = index === 0 ? 'M' : 'L';
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
};

const generateLinePath = (values: number[], width: number, height: number): { path: string; area: string } => {
  if (!values?.length) {
    return { path: '', area: '' };
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const denominator = Math.max(values.length - 1, 1);

  const points = values.map((value, index) => {
    const x = (index / denominator) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const path = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    })
    .join(' ');

  const area = `${path} L${width},${height} L0,${height} Z`;

  return { path, area };
};

const CryptoInvestmentPlatform = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CryptoTab>('bitcoin');
  const [cryptoData, setCryptoData] = useState<Record<CryptoTab, CryptoMeta>>(heroDefaults);
  const [marketCoins, setMarketCoins] = useState<MarketCoin[]>([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const autoExecutionTimers = useRef<number[]>([]);
  const [showSimulation, setShowSimulation] = useState(false);
  const [chartIndex, setChartIndex] = useState(0);
  const [chartComplete, setChartComplete] = useState(false);
  const [showSignupFlow, setShowSignupFlow] = useState(false);
  const [showSignInFlow, setShowSignInFlow] = useState(false);
  const [signupStep, setSignupStep] = useState<'credentials' | 'verify' | 'success'>('credentials');
  const [signupForm, setSignupForm] = useState<SignupFormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [signupMessage, setSignupMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [registeredProfile, setRegisteredProfile] = useState<RegisteredProfile | null>(null);
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [signInMessage, setSignInMessage] = useState('');
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [selectedDepositAsset, setSelectedDepositAsset] = useState<keyof typeof DEPOSIT_ADDRESSES>('usdt');
  const [selectedCoin, setSelectedCoin] = useState<MarketCoin | null>(null);
  const [pendingAction, setPendingAction] = useState<'buy' | 'sell' | 'auto' | 'view' | null>(null);
  const [copiedAsset, setCopiedAsset] = useState<DepositAssetKey | null>(null);
  const [tradeJournal, setTradeJournal] = useState<TradeExecution[]>([]);
  const [tradeFeedback, setTradeFeedback] = useState<string | null>(null);
  const [selectedWithdrawalMethod, setSelectedWithdrawalMethod] = useState<WithdrawalMethod>('usdt');
  const [withdrawForm, setWithdrawForm] = useState<WithdrawalFormState>({ amount: '', destination: '' });
  const [withdrawFeedback, setWithdrawFeedback] = useState<string | null>(null);

  const demoProfitRate = useMemo(() => 0.85 + Math.random() * 0.1, []);
  const demoProfit = Math.round(DEMO_INITIAL_CAPITAL * demoProfitRate * 100) / 100;
  const demoTotal = DEMO_INITIAL_CAPITAL + demoProfit;
  const profitPercent = Math.round(demoProfitRate * 100);

  const simulationSeries = useMemo(() => {
    const steps = 60;
    const baseValue = 1;
    const trajectory: { value: number; direction: 'buy' | 'sell' }[] = [{ value: baseValue, direction: 'buy' }];
    let current = baseValue;

    for (let index = 1; index < steps; index += 1) {
      const sellPhase = index % 5 === 2 || index % 5 === 4;
      const direction: 'buy' | 'sell' = sellPhase ? 'sell' : 'buy';
      const drift = sellPhase ? -0.12 : 0.22;
      const wave = Math.sin(index / 2.6) * 0.1;
      current += drift + wave;
      trajectory.push({ value: current, direction });
    }

    const rawValues = trajectory.map((point) => point.value);
    const minRaw = Math.min(...rawValues);
    const maxRaw = Math.max(...rawValues);
    const spread = maxRaw - minRaw || 1;

    return trajectory.map((point, index) => {
      const normalized = (point.value - minRaw) / spread;
      const price = index === trajectory.length - 1 ? demoTotal : DEMO_INITIAL_CAPITAL + normalized * (demoTotal - DEMO_INITIAL_CAPITAL);
      return { price, direction: index === 0 ? 'buy' : point.direction };
    });
  }, [demoTotal]);

  const chartPrices = useMemo(() => simulationSeries.map((point) => point.price), [simulationSeries]);
  const visibleSeries = useMemo(() => simulationSeries.slice(0, Math.max(chartIndex, 1)), [chartIndex, simulationSeries]);
  const currentSimulationPrice = visibleSeries[visibleSeries.length - 1]?.price ?? DEMO_INITIAL_CAPITAL;
  const liveProfit = Math.max(0, currentSimulationPrice - DEMO_INITIAL_CAPITAL);
  const liveProfitPercent = Math.round((liveProfit / DEMO_INITIAL_CAPITAL) * 100);

  const handleOpenWindow = useCallback((anchor: string) => {
    setMobileMenuOpen(false);
    if (typeof window === 'undefined') {
      return;
    }
    const element = document.getElementById(anchor);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleOpenPanel = useCallback(
    (panel: ActivePanel, options?: { presetWithdrawalMethod?: WithdrawalMethod; presetAmount?: string }) => {
      setActivePanel(panel);
      setMobileMenuOpen(false);
      if (panel === 'deposit') {
        setSelectedDepositAsset('usdt');
        setCopiedAsset(null);
      }
      if (panel === 'withdraw') {
        setSelectedWithdrawalMethod(options?.presetWithdrawalMethod ?? 'usdt');
        setWithdrawForm({ amount: options?.presetAmount ?? '', destination: '' });
        setWithdrawFeedback(null);
      }
    },
    [],
  );

  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
    setWithdrawFeedback(null);
  }, []);

  const handleCoinQuickView = useCallback((coin: MarketCoin, action: 'buy' | 'sell' | 'auto' | null = null) => {
    setSelectedCoin(coin);
    setPendingAction(action ?? 'view');
    setActivePanel(null);
    setMobileMenuOpen(false);
  }, []);

  const handleCopyAddress = useCallback(async (asset: DepositAssetKey) => {
    const address = DEPOSIT_ADDRESSES[asset];
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(address);
        setCopiedAsset(asset);
        window.setTimeout(() => setCopiedAsset((current) => (current === asset ? null : current)), 2200);
      }
    } catch (error) {
      console.warn('Unable to copy deposit address', error);
    }
  }, []);

  const handleOpenSignupFlow = useCallback(() => {
    setMobileMenuOpen(false);
    setShowSignupFlow(true);
    setSignupStep('credentials');
    setSignupForm({ fullName: '', email: '', password: '', confirmPassword: '' });
    setVerificationCode('');
    setEnteredCode('');
    setSignupMessage('');
  }, []);

  const handleCloseSignupFlow = useCallback(() => {
    setShowSignupFlow(false);
    if (!isAuthenticated) {
      setSignupStep('credentials');
    }
    setSignupMessage('');
  }, [isAuthenticated]);

  const persistAuth = useCallback((profile: RegisteredProfile | null, authenticated = true) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(
      'kv-auth',
      JSON.stringify({
        profile,
        authenticated,
        timestamp: Date.now(),
      }),
    );
  }, []);

  const handleOpenSignInFlow = useCallback(() => {
    setMobileMenuOpen(false);
    setShowSignInFlow(true);
    setSignInMessage('');
    setSignInForm((prev) => ({
      email: registeredProfile?.email ?? prev.email ?? '',
      password: '',
    }));
  }, [registeredProfile]);

  const handleCloseSignInFlow = useCallback(() => {
    setShowSignInFlow(false);
    setSignInMessage('');
  }, []);

  const handleCredentialsSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (signupForm.password.trim() !== signupForm.confirmPassword.trim()) {
        setSignupMessage('Passwords do not match. Please confirm and try again.');
        return;
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      setEnteredCode('');
      setSignupStep('verify');
      setSignupMessage(`A verification code has been sent to ${signupForm.email}.`);
    },
    [signupForm.confirmPassword, signupForm.email, signupForm.password],
  );

  const handleResendCode = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(code);
    setEnteredCode('');
    setSignupMessage(`A new verification code has been sent to ${signupForm.email}.`);
  }, [signupForm.email]);

  const handleSignInSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!registeredProfile) {
        setSignInMessage('No profile found. Please sign up to create your trading account.');
        return;
      }

      const enteredEmail = signInForm.email.trim().toLowerCase();
      const storedEmail = registeredProfile.email.trim().toLowerCase();

      if (enteredEmail !== storedEmail || signInForm.password !== registeredProfile.password) {
        setSignInMessage('Incorrect email or password. Please try again.');
        return;
      }

      setIsAuthenticated(true);
      setShowSignInFlow(false);
      setSignInMessage('');
      setSignupForm({
        fullName: registeredProfile.fullName,
        email: registeredProfile.email,
        password: registeredProfile.password,
        confirmPassword: registeredProfile.password,
      });
      persistAuth(registeredProfile, true);
    },
    [persistAuth, registeredProfile, signInForm.email, signInForm.password],
  );

  const handleVerifyCode = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (enteredCode.trim() === verificationCode.trim()) {
        setSignupStep('success');
        setSignupMessage('Email verified successfully. Redirecting to your dashboard...');
        const profile: RegisteredProfile = {
          fullName: signupForm.fullName,
          email: signupForm.email,
          password: signupForm.password,
        };
        setRegisteredProfile(profile);
        setSignupForm({
          fullName: profile.fullName,
          email: profile.email,
          password: profile.password,
          confirmPassword: profile.password,
        });
        setSignInForm({ email: profile.email, password: '' });
        persistAuth(profile, true);
        setIsAuthenticated(true);
        window.setTimeout(() => {
          setShowSignupFlow(false);
          setSignupMessage('');
        }, 1600);
      } else {
        setSignupMessage('The verification code is incorrect. Please try again.');
      }
    },
    [enteredCode, persistAuth, signupForm.email, signupForm.fullName, signupForm.password, verificationCode],
  );

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setSignupForm({ fullName: '', email: '', password: '', confirmPassword: '' });
    setVerificationCode('');
    setEnteredCode('');
    setSignupStep('credentials');
    setSignupMessage('');
    setShowSignInFlow(false);
    setSignInMessage('');
    setSignInForm({ email: registeredProfile?.email ?? '', password: '' });
    persistAuth(registeredProfile ?? null, false);
  }, [persistAuth, registeredProfile]);

  const findCoinById = useCallback(
    (coinId: string): MarketCoin | null => {
      const live = marketCoins.find((coin) => coin.id === coinId);
      if (live) {
        return live;
      }
      if ((['bitcoin', 'ethereum', 'solana'] as CryptoTab[]).includes(coinId as CryptoTab)) {
        const typed = coinId as CryptoTab;
        return createFallbackCoin(typed, cryptoData[typed]);
      }
      return null;
    },
    [cryptoData, marketCoins],
  );

  const generateTradeId = useCallback(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    [],
  );

  const pushTradeToJournal = useCallback((entry: TradeExecution) => {
    setTradeJournal((previous) => [entry, ...previous].slice(0, 25));
  }, []);

  const executeManualTrade = useCallback(
    (coin: MarketCoin, action: 'buy' | 'sell') => {
      const size = Number((Math.random() * 1.25 + 0.35).toFixed(2));
      const slipFactor = action === 'buy' ? 1 + Math.random() * 0.0009 : 1 - Math.random() * 0.0009;
      const filledPrice = Number((coin.current_price * slipFactor).toFixed(2));
      const resultValue =
        action === 'sell'
          ? Number((filledPrice * size * (0.02 + Math.random() * 0.06)).toFixed(2))
          : undefined;

      pushTradeToJournal({
        id: `manual-${generateTradeId()}`,
        coinId: coin.id,
        symbol: coin.symbol.toUpperCase(),
        action,
        price: filledPrice,
        size,
        status: action === 'sell' ? 'closed' : 'executed',
        timestamp: new Date().toISOString(),
        strategy: 'manual',
        notes:
          action === 'buy'
            ? 'Long exposure initiated with precision routing.'
            : 'Position closed and routed to your withdrawal hub.',
        result: resultValue,
      });

      setTradeFeedback(
        action === 'buy'
          ? `Buy order filled for ${coin.symbol.toUpperCase()} • ${size.toFixed(2)} units secured at ${formatCurrency(
              filledPrice,
            )}.`
          : `Sell order executed for ${coin.symbol.toUpperCase()} • ${
              resultValue ? formatCurrency(resultValue) : 'Profits'
            } prepared for withdrawal.`,
      );
    },
    [generateTradeId, pushTradeToJournal],
  );

  const startAutoPilotCycle = useCallback(
    (coin: MarketCoin) => {
      const size = Number((Math.random() * 1.8 + 0.6).toFixed(2));
      const entryPrice = Number((coin.current_price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2));
      const tradeId = `auto-${generateTradeId()}`;

      pushTradeToJournal({
        id: tradeId,
        coinId: coin.id,
        symbol: coin.symbol.toUpperCase(),
        action: 'buy',
        price: entryPrice,
        size,
        status: 'executed',
        timestamp: new Date().toISOString(),
        strategy: 'auto',
        notes: 'Auto pilot engaged after structural scan.',
      });

      setTradeFeedback(`Auto robot engaged • monitoring ${coin.symbol.toUpperCase()} for structure shifts.`);

      const exitDelay = 3500 + Math.floor(Math.random() * 4500);
      const timerId = window.setTimeout(() => {
        const exitPrice = Number((entryPrice * (1 + 0.01 + Math.random() * 0.02)).toFixed(2));
        const resultValue = Number(((exitPrice - entryPrice) * size).toFixed(2));

        pushTradeToJournal({
          id: `${tradeId}-close`,
          coinId: coin.id,
          symbol: coin.symbol.toUpperCase(),
          action: 'sell',
          price: exitPrice,
          size,
          status: 'closed',
          timestamp: new Date().toISOString(),
          strategy: 'auto',
          notes: 'Auto cycle exited—structure shift detected.',
          result: resultValue,
        });

        setTradeFeedback(`Auto cycle closed on ${coin.symbol.toUpperCase()} • Realized ${formatCurrency(resultValue)}.`);
        autoExecutionTimers.current = autoExecutionTimers.current.filter((stored) => stored !== timerId);
      }, exitDelay);

      autoExecutionTimers.current.push(timerId);
    },
    [generateTradeId, pushTradeToJournal],
  );

  const handleWithdrawalSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const option = WITHDRAWAL_OPTIONS[selectedWithdrawalMethod];
      const amountValue = parseFloat(withdrawForm.amount.replace(/[^0-9.]/g, ''));

      if (Number.isNaN(amountValue) || amountValue <= 0) {
        setWithdrawFeedback('Enter a valid withdrawal amount to continue.');
        return;
      }

      if (!withdrawForm.destination.trim()) {
        setWithdrawFeedback('Provide the receiving details so we can route funds correctly.');
        return;
      }

      setWithdrawFeedback(`Withdrawal request queued via ${option.label}. Await treasury confirmation.`);
      setTradeFeedback(`Withdrawal of ${formatCurrency(amountValue)} scheduled through ${option.label}.`);

      pushTradeToJournal({
        id: `withdraw-${generateTradeId()}`,
        coinId: selectedWithdrawalMethod,
        symbol: option.label.split(' ')[0]?.toUpperCase() ?? selectedWithdrawalMethod.toUpperCase(),
        action: 'sell',
        price: Number(amountValue.toFixed(2)),
        size: 1,
        status: 'closed',
        timestamp: new Date().toISOString(),
        strategy: 'manual',
        notes: `Payout instructions submitted: ${withdrawForm.destination.trim()}`,
        result: Number(amountValue.toFixed(2)),
      });

      setWithdrawForm({ amount: '', destination: '' });
    },
    [generateTradeId, pushTradeToJournal, selectedWithdrawalMethod, withdrawForm],
  );

  const handleHeroAction = useCallback(
    (action: 'buy' | 'sell') => {
      const coin = findCoinById(activeTab) ?? createFallbackCoin(activeTab, cryptoData[activeTab]);
      handleCoinQuickView(coin, action);
    },
    [activeTab, cryptoData, findCoinById, handleCoinQuickView],
  );

  const handleStrategyAction = useCallback(
    (action: 'buy' | 'sell' | 'auto', coin: MarketCoin) => {
      setSelectedCoin(null);
      setPendingAction(null);

      if (!isAuthenticated) {
        handleOpenSignInFlow();
        setSignInMessage(
          action === 'auto'
            ? `Log in to activate auto-trading for ${coin.symbol.toUpperCase()} instantly. New here? Sign up from this window.`
            : `Log in to ${action.toUpperCase()} ${coin.symbol.toUpperCase()} with institutional-grade execution. Need an account? Use Sign Up to get started.`,
        );
        return;
      }

      if (action === 'auto') {
        startAutoPilotCycle(coin);
        return;
      }

      executeManualTrade(coin, action);

      if (action === 'buy') {
        const depositAsset = resolveDepositAsset(coin);
        setSelectedDepositAsset(depositAsset);
        handleOpenPanel('deposit');
        return;
      }

      const withdrawalAsset = resolveDepositAsset(coin) as WithdrawalMethod;
      const estimatedAmount = Math.max(500, coin.current_price * 0.18);
      handleOpenPanel('withdraw', {
        presetWithdrawalMethod: withdrawalAsset,
        presetAmount: estimatedAmount.toFixed(2),
      });
    },
    [
      executeManualTrade,
      handleOpenPanel,
      handleOpenSignInFlow,
      isAuthenticated,
      setSignInMessage,
      startAutoPilotCycle,
    ],
  );

  useEffect(() => {
    return () => {
      autoExecutionTimers.current.forEach((timerId) => window.clearTimeout(timerId));
      autoExecutionTimers.current = [];
    };
  }, []);

  useEffect(() => {
    if (!tradeFeedback) {
      return;
    }
    const timerId = window.setTimeout(() => setTradeFeedback(null), 4000);
    return () => window.clearTimeout(timerId);
  }, [tradeFeedback]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem('kv-auth');
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as { profile?: RegisteredProfile | null; authenticated?: boolean };
      if (parsed?.profile) {
        setRegisteredProfile(parsed.profile);
        setSignupForm({
          fullName: parsed.profile.fullName,
          email: parsed.profile.email,
          password: parsed.profile.password,
          confirmPassword: parsed.profile.password,
        });
        setSignInForm({ email: parsed.profile.email, password: '' });
      }
      setIsAuthenticated(Boolean(parsed?.authenticated));
    } catch (error) {
      console.warn('Unable to restore saved session.', error);
      window.localStorage.removeItem('kv-auth');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem(TRADE_JOURNAL_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setTradeJournal(parsed.slice(0, 25));
      }
    } catch (error) {
      console.warn('Unable to restore trade journal.', error);
      window.localStorage.removeItem(TRADE_JOURNAL_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(TRADE_JOURNAL_STORAGE_KEY, JSON.stringify(tradeJournal));
    } catch (error) {
      console.warn('Unable to persist trade journal.', error);
    }
  }, [tradeJournal]);

  useEffect(() => {
    if (!showSimulation) {
      setChartIndex(0);
      setChartComplete(false);
      return;
    }

    const totalPoints = simulationSeries.length;
    const stepDuration = Math.max(Math.floor(60_000 / Math.max(totalPoints, 1)), 500);
    setChartIndex(1);
    setChartComplete(false);
    let currentPoint = 1;

    const intervalId = window.setInterval(() => {
      currentPoint += 1;
      setChartIndex((prev) => {
        const next = Math.min(currentPoint, totalPoints);
        if (next >= totalPoints) {
          window.clearInterval(intervalId);
          setChartComplete(true);
        }
        return next;
      });
    }, stepDuration);

    return () => window.clearInterval(intervalId);
  }, [showSimulation, simulationSeries]);

  const fetchMarketData = useCallback(async (showSpinner = false) => {
    if (showSpinner || !hasLoadedOnce.current) {
      setLoadingMarkets(true);
    }
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h',
      );

      if (!response.ok) {
        throw new Error('Failed to load market data');
      }

      const data: MarketCoin[] = await response.json();
      setMarketCoins(data);
      setCryptoData((prev) => {
        const next = { ...prev };
        (['bitcoin', 'ethereum', 'solana'] as CryptoTab[]).forEach((coinId) => {
          const live = data.find((coin) => coin.id === coinId);
          if (live) {
            next[coinId] = {
              price: live.current_price,
              change: live.price_change_percentage_24h ?? 0,
            };
          }
        });
        return next;
      });
      setMarketError(null);
      hasLoadedOnce.current = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to fetch market data';
      setMarketError(message);
    } finally {
      setLoadingMarkets(false);
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    const intervalId = window.setInterval(() => fetchMarketData(), 60_000);
    return () => window.clearInterval(intervalId);
  }, [fetchMarketData]);

  const handleRefreshMarkets = useCallback(() => fetchMarketData(true), [fetchMarketData]);

  const activeCrypto = cryptoData[activeTab];

  const marketRows = useMemo(() => {
    if (loadingMarkets) {
      return (
        <tr>
          <td colSpan={7} className="p-6 text-center text-slate-400">
            Loading live market data...
          </td>
        </tr>
      );
    }

    if (marketError) {
      return (
        <tr>
          <td colSpan={7} className="p-6 text-center text-red-400">
            {marketError}
          </td>
        </tr>
      );
    }

    if (!marketCoins.length) {
      return (
        <tr>
          <td colSpan={7} className="p-6 text-center text-slate-400">
            No market data available right now.
          </td>
        </tr>
      );
    }

  return marketCoins.map((coin) => {
      const change = coin.price_change_percentage_24h ?? 0;
      const isPositive = change >= 0;
      const sparkline = coin.sparkline_in_7d?.price ?? [];
      const sparklinePath = generateSparklinePath(sparkline);
      const gradientId = `sparkline-gradient-${coin.id}`;
      return (
        <tr
          key={coin.id}
          className="border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/40 transition cursor-pointer"
          onClick={() => handleCoinQuickView(coin)}
        >
          <td className="p-4">
            <div className="flex items-center gap-3">
              <img src={coin.image} alt={`${coin.name} logo`} className="w-8 h-8 rounded-full" />
              <div>
                <p className="font-semibold text-white">{coin.name}</p>
                <p className="text-xs uppercase text-slate-400">{coin.symbol}</p>
              </div>
            </div>
          </td>
          <td className="p-4 font-semibold text-white">{formatCurrency(coin.current_price)}</td>
          <td className="p-4">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                isPositive
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-red-500/15 text-red-400'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {formatPercentage(change)}
            </span>
          </td>
          <td className="p-4 text-slate-300">{formatCompact(coin.market_cap)}</td>
          <td className="p-4 text-slate-300">{formatCompact(coin.total_volume)}</td>
          <td className="p-4">
            <div className="flex items-center justify-center">
              {sparklinePath ? (
                <svg
                  viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
                  width={SPARKLINE_WIDTH}
                  height={SPARKLINE_HEIGHT}
                  role="img"
                  aria-label={`${coin.name} 7-day price trend`}
                  className="overflow-visible"
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#f87171'} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#f87171'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${sparklinePath} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`}
                    fill={`url(#${gradientId})`}
                    opacity={0.35}
                  />
                  <path
                    d={sparklinePath}
                    fill="none"
                    stroke={isPositive ? '#4ade80' : '#f87171'}
                    strokeWidth={2}
                  />
                </svg>
              ) : (
                <span className="text-xs text-slate-500">Trend unavailable</span>
              )}
            </div>
          </td>
          <td className="p-4">
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-xs font-semibold text-green-200 transition hover:border-green-500 hover:bg-green-500/20"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCoinQuickView(coin, 'buy');
                }}
              >
                Buy
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:border-red-500 hover:bg-red-500/20"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCoinQuickView(coin, 'sell');
                }}
              >
                Sell
              </button>
              <button
                type="button"
                className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition hover:border-blue-500 hover:bg-blue-500/20"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCoinQuickView(coin, 'auto');
                }}
              >
                Auto
              </button>
            </div>
          </td>
        </tr>
      );
    });
  }, [handleCoinQuickView, loadingMarkets, marketCoins, marketError]);

  const topMarketCoins = useMemo(() => marketCoins.slice(0, 12), [marketCoins]);

  const selectedCoinSeries = useMemo(() => {
    if (!selectedCoin) {
      return [] as number[];
    }

    const baseSeries = selectedCoin.sparkline_in_7d?.price ?? [];
    if (baseSeries.length) {
      return baseSeries.slice(-72);
    }

    const referencePrice = selectedCoin.current_price || 0;
    return Array.from({ length: 72 }, (_, index) => {
      const wave = Math.sin(index / 3) * referencePrice * 0.015;
      const drift = index * ((selectedCoin.price_change_percentage_24h ?? 0) / 100) * (referencePrice * 0.0025);
      const noise = Math.cos(index / 2.5) * referencePrice * 0.006;
      return referencePrice + wave + drift + noise;
    });
  }, [selectedCoin]);

  const selectedCoinPaths = useMemo(() => generateLinePath(selectedCoinSeries, 560, 220), [selectedCoinSeries]);

  const weeklyPerformance = useMemo(() => {
    if (!selectedCoin) {
      return 0;
    }
    return Math.round((0.85 + Math.random() * 0.1) * 100);
  }, [selectedCoin]);

  const heroCoin = useMemo(() => {
    const fromMarket = marketCoins.find((coin) => coin.id === activeTab);
    if (fromMarket) {
      return fromMarket;
    }
    if ((['bitcoin', 'ethereum', 'solana'] as CryptoTab[]).includes(activeTab)) {
      return createFallbackCoin(activeTab, cryptoData[activeTab]);
    }
    return null;
  }, [activeTab, cryptoData, marketCoins]);

  const heroSeries = useMemo(() => {
    if (!heroCoin) {
      return [] as number[];
    }
    const baseSeries = heroCoin.sparkline_in_7d?.price ?? [];
    if (baseSeries.length) {
      return baseSeries.slice(-60);
    }
    const referencePrice = heroCoin.current_price || 1;
    return Array.from({ length: 60 }, (_, index) => {
      const slope = (heroCoin.price_change_percentage_24h ?? 0) / 100;
      const wave = Math.sin(index / 3.2) * referencePrice * 0.012;
      const drift = referencePrice * (1 + slope * (index / 60));
      return drift + wave;
    });
  }, [heroCoin]);

  const heroLinePaths = useMemo(() => generateLinePath(heroSeries, 320, 120), [heroSeries]);

  const simulationChartWidth = 560;
  const simulationChartHeight = 200;
  const simulationFullPaths = useMemo(() => generateLinePath(chartPrices, simulationChartWidth, simulationChartHeight), [chartPrices]);
  const simulationProgressRatio = useMemo(() => {
    const total = Math.max(simulationSeries.length, 1);
    return Math.min(1, chartIndex / total);
  }, [chartIndex, simulationSeries.length]);
  const simulationClipId = useMemo(() => `simulation-progress-${Math.random().toString(36).slice(2, 9)}`, []);
  const simulationProgressWidth = simulationChartWidth * simulationProgressRatio;

  const handleWatchDemo = () => {
    setMobileMenuOpen(false);
    setShowSimulation(true);
  };

  const handleCloseSimulation = () => {
    setShowSimulation(false);
  };

  const handleNavigate = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <nav
        className={`fixed w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-slate-950/95 backdrop-blur-lg shadow-lg shadow-blue-500/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold">KryptoVault</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <button type="button" className="hover:text-blue-400 transition" onClick={() => handleOpenPanel('market')}>
                Markets
              </button>
              <button type="button" className="hover:text-blue-400 transition" onClick={() => handleOpenPanel('features')}>
                Features
              </button>
              <button type="button" className="hover:text-blue-400 transition" onClick={() => handleOpenWindow('about')}>
                About
              </button>
              <button type="button" className="hover:text-blue-400 transition" onClick={() => handleOpenPanel('security')}>
                Security
              </button>
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 border border-emerald-500 rounded-lg hover:bg-emerald-500/10 transition"
                    onClick={() => handleOpenPanel('deposit')}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 border border-amber-500 rounded-lg hover:bg-amber-500/10 transition"
                    onClick={() => handleOpenPanel('withdraw')}
                  >
                    Withdraw
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition"
                    onClick={() => handleOpenWindow('auto-trade')}
                  >
                    Trade
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:text-white transition"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 border border-blue-500 rounded-lg hover:bg-blue-500/10 transition"
                    onClick={handleOpenSignInFlow}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition"
                    onClick={handleOpenSignupFlow}
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>

            <button className="md:hidden" onClick={() => setMobileMenuOpen((prev) => !prev)}>
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800">
            <div className="px-6 py-4 space-y-4">
              <button type="button" className="block w-full text-left hover:text-blue-400" onClick={() => handleOpenPanel('market')}>
                Markets
              </button>
              <button type="button" className="block w-full text-left hover:text-blue-400" onClick={() => handleOpenPanel('features')}>
                Features
              </button>
              <button type="button" className="block w-full text-left hover:text-blue-400" onClick={() => handleOpenWindow('about')}>
                About
              </button>
              <button type="button" className="block w-full text-left hover:text-blue-400" onClick={() => handleOpenPanel('security')}>
                Security
              </button>
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    className="w-full px-4 py-2 border border-emerald-500 rounded-lg"
                    onClick={() => handleOpenPanel('deposit')}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 border border-amber-500 rounded-lg"
                    onClick={() => handleOpenPanel('withdraw')}
                  >
                    Withdraw
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
                    onClick={() => handleOpenWindow('auto-trade')}
                  >
                    Trade
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left text-slate-400 hover:text-white"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="w-full px-4 py-2 border border-blue-500 rounded-lg"
                    onClick={handleOpenSignInFlow}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"
                    onClick={handleOpenSignupFlow}
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

  <section className="pt-32 pb-20 px-6" id="hero">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span>Trusted by 500K+ traders worldwide</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                Invest in the
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> Future </span>
                of Finance
              </h1>

              <p className="text-xl text-slate-300">
                Trade cryptocurrencies with confidence. Advanced tools, institutional-grade security, and 24/7 support for your investment journey.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  type="button"
                  className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg font-semibold hover:shadow-xl hover:shadow-blue-500/50 transition transform hover:scale-105"
                  onClick={handleOpenSignInFlow}
                >
                  Log In
                  <ChevronRight className="inline w-5 h-5 ml-2" />
                </button>
                <button
                  type="button"
                  className="px-8 py-4 border border-slate-600 rounded-lg font-semibold hover:bg-slate-800 transition"
                  onClick={handleWatchDemo}
                >
                  Watch Demo
                </button>
              </div>

              <p className="text-sm text-slate-400">
                Don't have an account yet?
                <button
                  type="button"
                  className="ml-2 inline-flex items-center text-blue-300 underline-offset-2 hover:text-blue-200 hover:underline"
                  onClick={handleOpenSignupFlow}
                >
                  Sign Up
                </button>
              </p>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-slate-300">SEC Regulated</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-slate-300">FDIC Insured</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur-3xl opacity-30" />
              <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Live Markets</h3>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Live</span>
                </div>

                <div className="flex gap-2">
                  {(['bitcoin', 'ethereum', 'solana'] as CryptoTab[]).map((crypto) => (
                    <button
                      key={crypto}
                      onClick={() => setActiveTab(crypto)}
                      className={`flex-1 px-4 py-2 rounded-lg capitalize transition ${
                        activeTab === crypto ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {crypto}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Current Price</p>
                      <p className="text-4xl font-bold">{formatCurrency(activeCrypto.price)}</p>
                    </div>
                    <div
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg ${
                        activeCrypto.change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {activeCrypto.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      <span className="font-semibold">{formatPercentage(activeCrypto.change)}</span>
                    </div>
                  </div>

                  <div className="h-32 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                    {heroLinePaths.path ? (
                      <svg viewBox="0 0 320 120" width={320} height={120} role="img" aria-label="Hero market performance" className="h-full w-full">
                        <defs>
                          <linearGradient id="hero-line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <path d={heroLinePaths.area} fill="url(#hero-line-gradient)" opacity={0.5} />
                        <path d={heroLinePaths.path} fill="none" stroke="#a855f7" strokeWidth={2.5} strokeLinecap="round" />
                      </svg>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">Trend data unavailable</div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-semibold transition"
                    onClick={() => handleHeroAction('buy')}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition"
                    onClick={() => handleHeroAction('sell')}
                  >
                    Sell
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="market-overview" className="py-16 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold">Live Cryptocurrency Markets</h2>
              <p className="text-slate-400">Prices update automatically every minute using real-time market data.</p>
            </div>
            <button
              type="button"
              className="self-start lg:self-center px-4 py-2 border border-blue-500/40 rounded-lg hover:bg-blue-500/10 transition"
              onClick={handleRefreshMarkets}
            >
              Refresh now
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur">
            <table className="min-w-full divide-y divide-slate-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th className="p-4">Asset</th>
                  <th className="p-4">Price (USD)</th>
                  <th className="p-4">24h Change</th>
                  <th className="p-4">Market Cap</th>
                  <th className="p-4">24h Volume</th>
                  <th className="p-4">Trend</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>{marketRows}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-900/50" id="stats">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center space-y-2">
                <p className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Why Choose
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"> KryptoVault</span>
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Experience the most advanced crypto investment platform with features designed for both beginners and professionals
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {isAuthenticated && (
        <>
          <section id="member-hub" className="py-20 px-6 bg-gradient-to-br from-emerald-900/40 via-slate-950 to-blue-900/40">
            <div className="max-w-6xl mx-auto text-center space-y-6">
              <div className="inline-flex items-center gap-3 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-200">
                <BadgeCheck className="h-4 w-4" />
                Account Verified — Welcome Back, {signupForm.fullName || 'Vault Trader'}!
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold">
                Your Trading Command Center Is Now Active
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-slate-200">
                Manage capital flows, schedule instant withdrawals, and let our 99% guaranteed smart-trade robots execute precision strategies around the clock. Members regularly unlock up to <span className="text-emerald-300 font-semibold">300% weekly profit</span> through fully automated cycles.
              </p>
            </div>
          </section>

          <section id="deposit" className="py-20 px-6 bg-slate-900/60">
            <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2">
              <div className="space-y-5">
                <h3 className="text-3xl font-bold text-emerald-300">Fund Your Vault Balance</h3>
                <p className="text-slate-300">
                  Choose the funding method that fits your needs. As soon as your deposit hits the blockchain, our system locks it into your protected vault and signals the robots to queue the next profit cycle.
                </p>
                <ul className="space-y-4 text-left">
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-3 w-3 rounded-full bg-emerald-400" />
                    <p className="text-slate-200"><strong>Step 1:</strong> Pick a network (TRC20 USDT, ERC20 USDT, or BTC) and copy the secure wallet address displayed in your dashboard.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-3 w-3 rounded-full bg-emerald-400" />
                    <p className="text-slate-200"><strong>Step 2:</strong> Send the amount you wish to allocate. Minimum starting capital remains <span className="font-semibold text-emerald-300">$500</span>.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1 h-3 w-3 rounded-full bg-emerald-400" />
                    <p className="text-slate-200"><strong>Step 3:</strong> Our vault confirms your transaction in real-time and prepares it for automated trading deployment.</p>
                  </li>
                </ul>
              </div>
              <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-950 p-8 shadow-lg shadow-emerald-500/20">
                <h4 className="text-xl font-semibold text-emerald-200">Instant Funding Snapshot</h4>
                <div className="mt-6 grid gap-4">
                  {DEPOSIT_ORDER.map((assetKey) => {
                    const meta = DEPOSIT_METADATA[assetKey];
                    const address = DEPOSIT_ADDRESSES[assetKey];
                    const isInstructional = assetKey === 'card' || assetKey === 'wire';
                    return (
                      <div
                        key={`funding-${assetKey}`}
                        className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-4 text-left"
                      >
                        <p className="text-xs uppercase tracking-wide text-emerald-300">{meta.label}</p>
                        <p
                          className={`mt-2 text-sm text-emerald-100 ${
                            isInstructional ? 'whitespace-pre-wrap leading-relaxed font-medium' : 'font-mono break-all'
                          }`}
                        >
                          {address}
                        </p>
                      </div>
                    );
                  })}
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-4 text-left">
                    <p className="text-xs uppercase tracking-wide text-emerald-300">Deposit Window</p>
                    <p className="mt-2 text-lg font-semibold text-white">24/7 — confirmations <span className="text-emerald-300">under 5 minutes</span></p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-4 text-left">
                    <p className="text-xs uppercase tracking-wide text-emerald-300">Automation Status</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-200">Ready — 99% guaranteed robots on standby</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="withdraw" className="py-20 px-6 bg-gradient-to-r from-purple-900/40 via-slate-950 to-blue-900/40">
            <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-2">
              <div className="rounded-3xl border border-purple-500/40 bg-white/5 p-8 backdrop-blur">
                <h3 className="text-3xl font-bold text-purple-200">Withdraw Profits Instantly</h3>
                <p className="mt-4 text-slate-200">
                  Unlock your compounded balance whenever you choose. A single tap triggers automated compliance checks and releases funds directly to your connected wallet.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-purple-200">Withdrawal Methods</p>
                    <p className="mt-2 text-slate-100">USDT (TRC20 / ERC20), BTC, Direct Bank Wire</p>
                  </div>
                  <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-purple-200">Processing Time</p>
                    <p className="mt-2 text-slate-100">Average release in <span className="font-semibold">3 minutes</span> with guaranteed payout confirmation.</p>
                  </div>
                  <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-4">
                    <p className="text-xs uppercase tracking-wide text-purple-200">Schedule</p>
                    <p className="mt-2 text-slate-100">Withdraw anytime or set automated weekly payouts.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-5 text-left">
                <h4 className="text-xl font-semibold text-purple-200">How it works</h4>
                <p className="text-slate-200">1. Select the balance slice you want to release and confirm the destination wallet.</p>
                <p className="text-slate-200">2. Our risk engine validates the request and authorizes the transfer instantly.</p>
                <p className="text-slate-200">3. Follow the live tracker to watch confirmations clear in real-time.</p>
                <p className="text-slate-300">You are always in control—switch between reinvesting profits and withdrawing them with a single toggle.</p>
              </div>
            </div>
          </section>

          <section id="auto-trade" className="py-20 px-6 bg-slate-900/70">
            <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-3xl font-bold text-blue-200">99% Guaranteed Trading Robots</h3>
                <p className="text-slate-200">
                  Activate the auto-trade toggle to let our AI stack execute high-frequency arbitrage, cross-pair hedging, and predictive momentum moves simultaneously.
                </p>
                <p className="text-slate-200">
                  Each cycle is engineered to deliver up to <span className="font-semibold text-blue-300">300% profit weekly</span> with risk spread across BTC, ETH, SOL, and 100+ micro-pairs.
                </p>
                <div className="rounded-3xl border border-blue-500/40 bg-blue-500/10 p-6">
                  <p className="text-xs uppercase tracking-wide text-blue-200">Automation Blueprint</p>
                  <ul className="mt-3 space-y-2 text-sm text-blue-100">
                    <li>• Signal ingestion from 24 exchanges every 150ms</li>
                    <li>• Smart capital rotation to keep your vault 100% deployed</li>
                    <li>• Autonomous reinvestment scheduler to amplify compounding</li>
                  </ul>
                </div>
              </div>
              <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-slate-900 p-8 shadow-xl shadow-blue-500/20">
                <h4 className="text-xl font-semibold text-blue-100">Your Weekly Playbook</h4>
                <div className="mt-5 space-y-4 text-left text-slate-100">
                  <p><strong>Monday–Wednesday:</strong> Robots harvest volatility spikes across majors.</p>
                  <p><strong>Thursday:</strong> Profit vaulting and compounded balance review.</p>
                  <p><strong>Friday:</strong> Optional auto-withdrawal directly to your wallet.</p>
                  <p className="text-sm text-blue-200">Stay in the loop via push notifications showing every trade cluster and realized gain.</p>
                </div>
              </div>
            </div>
          </section>

          {tradeJournal.length > 0 && (
            <section id="execution-journal" className="py-20 px-6 bg-slate-950/60">
              <div className="max-w-6xl mx-auto">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
                    <TrendingUp className="h-4 w-4" />
                    Execution Journal
                  </div>
                  <h3 className="text-3xl font-bold text-white">Live Order Flow</h3>
                  <p className="text-slate-300">
                    Every manual click and auto-robot cycle is timestamped here. Review fills, position sizes, and realized profits in real time.
                  </p>
                </div>

                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/90 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Timestamp</th>
                        <th className="px-5 py-3">Action</th>
                        <th className="px-5 py-3">Symbol</th>
                        <th className="px-5 py-3">Price</th>
                        <th className="px-5 py-3">Size</th>
                        <th className="px-5 py-3">Strategy</th>
                        <th className="px-5 py-3">Result</th>
                        <th className="px-5 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeJournal.slice(0, 8).map((entry) => (
                        <tr key={`journal-row-${entry.id}`} className="border-t border-slate-800/70">
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-3 font-semibold text-white">
                            {entry.action.toUpperCase()}
                          </td>
                          <td className="px-5 py-3">{entry.symbol}</td>
                          <td className="px-5 py-3">{formatCurrency(entry.price)}</td>
                          <td className="px-5 py-3">{entry.size.toFixed(2)}</td>
                          <td className="px-5 py-3 capitalize">{entry.strategy}</td>
                          <td className="px-5 py-3">
                            {entry.result ? formatCurrency(entry.result) : '—'}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400">{entry.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      <section className="py-20 px-6" id="about">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-30" />
            <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold">Ready to Start Trading?</h2>
              <p className="text-xl opacity-90 max-w-2xl mx-auto">
                Join thousands of traders who trust KryptoVault for their cryptocurrency investments
              </p>
              <button
                type="button"
                className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:shadow-xl transition transform hover:scale-105"
                onClick={handleOpenSignupFlow}
              >
                Create Free Account
                <ChevronRight className="inline w-5 h-5 ml-2" />
              </button>
              <p className="text-sm opacity-75">No credit card required • $500 minimum starting capital</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 border-t border-slate-800 py-12 px-6" id="security">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold">KryptoVault</span>
              </div>
              <p className="text-slate-400 text-sm">The most trusted cryptocurrency investment platform for modern traders.</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/about')}
                  >
                    Trading
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/about')}
                  >
                    Staking
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/about')}
                  >
                    Wallet
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/about')}
                  >
                    API
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/about')}
                  >
                    About Us
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/about')}
                  >
                    Careers
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/contact')}
                  >
                    Blog
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/contact')}
                  >
                    Press
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/contact')}
                  >
                    Help Center
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/contact')}
                  >
                    Contact
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/privacy')}
                  >
                    Legal
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="hover:text-blue-400 transition"
                    onClick={() => handleNavigate('/privacy')}
                  >
                    Privacy
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <p>© 2025 CryptoVault. All rights reserved.</p>
            <div className="flex gap-6">
              <button
                type="button"
                className="hover:text-blue-400 transition"
                onClick={() => handleNavigate('/terms')}
              >
                Terms
              </button>
              <button
                type="button"
                className="hover:text-blue-400 transition"
                onClick={() => handleNavigate('/privacy')}
              >
                Privacy
              </button>
              <button
                type="button"
                className="hover:text-blue-400 transition"
                onClick={() => handleNavigate('/cookies')}
              >
                Cookies
              </button>
            </div>
          </div>
        </div>
      </footer>

      {activePanel && (
        <div className="fixed inset-0 z-[58] flex items-center justify-center bg-slate-950/85 backdrop-blur px-4 py-8">
          <div className="relative w-full max-w-5xl rounded-3xl border border-blue-500/30 bg-slate-900/95 p-10 shadow-2xl shadow-blue-500/20 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={handleClosePanel}
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>

            {activePanel === 'market' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">
                      <BarChart3 className="h-4 w-4" />
                      Markets
                    </div>
                    <h3 className="text-3xl font-bold text-white">Live Market Intelligence</h3>
                    <p className="text-slate-300">
                      Track the top performing assets in real time. Every signal syncs directly with our automated trading engine for instant execution.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-blue-200"
                      onClick={handleRefreshMarkets}
                    >
                      Refresh Data
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-500 hover:text-emerald-200"
                      onClick={() => setShowSimulation(true)}
                    >
                      Run Demo
                    </button>
                  </div>
                </div>

                {loadingMarkets && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-300">
                    Loading the latest price action...
                  </div>
                )}

                {marketError && !loadingMarkets && (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-200">
                    {marketError}
                  </div>
                )}

                {!loadingMarkets && !marketError && !topMarketCoins.length && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-300">
                    Market data is temporarily unavailable. Please refresh in a moment.
                  </div>
                )}

                {!!topMarketCoins.length && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {topMarketCoins.map((coin) => {
                      const change = coin.price_change_percentage_24h ?? 0;
                      const positive = change >= 0;
                      const series = coin.sparkline_in_7d?.price ?? [];
                      const { path, area } = generateLinePath(series.length ? series.slice(-48) : [coin.current_price], 220, 80);
                      const gradientId = `modal-line-${coin.id}`;
                      return (
                        <div key={coin.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-inner shadow-slate-950/40">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <img src={coin.image} alt={`${coin.name} icon`} className="h-10 w-10 rounded-full" />
                              <div>
                                <p className="text-lg font-semibold text-white">{coin.name}</p>
                                <p className="text-xs uppercase tracking-wider text-slate-400">{coin.symbol}</p>
                              </div>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                                positive ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                              }`}
                            >
                              {positive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                              {formatPercentage(change)}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between text-sm text-slate-300">
                              <span>Spot Price</span>
                              <span className="font-semibold text-white">{formatCurrency(coin.current_price)}</span>
                            </div>
                            <div className="h-24 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                              {path ? (
                                <svg viewBox="0 0 220 80" width={220} height={80} role="img" aria-label={`${coin.name} performance`} className="w-full">
                                  <defs>
                                    <linearGradient id={`${gradientId}-stroke`} x1="0%" y1="0%" x2="0%" y2="100%">
                                      <stop offset="0%" stopColor={positive ? '#22c55e' : '#f87171'} stopOpacity={0.8} />
                                      <stop offset="100%" stopColor={positive ? '#22c55e' : '#f87171'} stopOpacity={0.1} />
                                    </linearGradient>
                                  </defs>
                                  <path d={area} fill={`url(#${gradientId}-stroke)`} opacity={0.25} />
                                  <path d={path} fill="none" stroke={positive ? '#4ade80' : '#f87171'} strokeWidth={2.4} strokeLinecap="round" />
                                </svg>
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-slate-500">Trend data unavailable</div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                              <div className="rounded-xl border border-slate-800/80 px-3 py-2">
                                <p className="uppercase tracking-wide text-slate-500">Market Cap</p>
                                <p className="mt-1 text-sm font-semibold text-slate-100">{formatCompact(coin.market_cap)}</p>
                              </div>
                              <div className="rounded-xl border border-slate-800/80 px-3 py-2">
                                <p className="uppercase tracking-wide text-slate-500">24h Volume</p>
                                <p className="mt-1 text-sm font-semibold text-slate-100">{formatCompact(coin.total_volume)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-blue-400 hover:to-purple-500"
                                onClick={() => handleCoinQuickView(coin, 'buy')}
                              >
                                View Strategy
                                <ChevronRight className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-emerald-400 hover:text-emerald-200"
                                onClick={() => handleCoinQuickView(coin, 'auto')}
                              >
                                Auto Robot Plan
                                <Zap className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activePanel === 'features' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-purple-200">
                    <Star className="h-4 w-4" />
                    Features
                  </div>
                  <h3 className="text-3xl font-bold text-white">Why Traders Choose KryptoVault</h3>
                  <p className="text-slate-300">
                    Every tool is engineered for professionals – from lightning execution to institutional analytics and automated wealth strategies.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {features.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-6 w-6 text-blue-300" />
                        <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{item.desc}</p>
                      <div className="mt-4 h-[1px] w-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-transparent" />
                      <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Optimized for 24/7 crypto markets</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'security' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-green-200">
                    <Shield className="h-4 w-4" />
                    Security
                  </div>
                  <h3 className="text-3xl font-bold text-white">Institutional-Grade Protection</h3>
                  <p className="text-slate-300">
                    Your vault is defended by layered security, real-time monitoring, and global regulatory alignment. Every withdrawal is risk-scored in milliseconds.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {securityHighlights.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                      <div className="flex items-center gap-3">
                        <item.icon className="h-6 w-6 text-emerald-300" />
                        <h4 className="text-lg font-semibold text-white">{item.title}</h4>
                      </div>
                      <p className="mt-3 text-sm text-slate-300">{item.detail}</p>
                      <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                        <KeyRound className="h-3 w-3" />
                        SOC 2 • ISO 27001 • AMLD5 compliant
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
                  All smart-trade automation runs on segregated infrastructure with hardware security modules and daily third-party audits.
                </div>
              </div>
            )}

            {activePanel === 'deposit' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
                    <Wallet className="h-4 w-4" />
                    Deposit
                  </div>
                  <h3 className="text-3xl font-bold text-white">Fund Your Vault</h3>
                  <p className="text-slate-300">
                    Select the asset you want to credit. Minimum capital is $500 to unlock the trading algorithms and automated yield engines.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {(Object.keys(DEPOSIT_METADATA) as DepositAssetKey[]).map((assetKey) => {
                    const meta = DEPOSIT_METADATA[assetKey];
                    const isActive = selectedDepositAsset === assetKey;
                    return (
                      <button
                        key={assetKey}
                        type="button"
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-emerald-400/60'
                        }`}
                        onClick={() => {
                          setSelectedDepositAsset(assetKey);
                          setCopiedAsset(null);
                        }}
                      >
                        <p className="text-sm font-semibold">{meta.label}</p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">{meta.network}</p>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const meta = DEPOSIT_METADATA[selectedDepositAsset];
                  const address = DEPOSIT_ADDRESSES[selectedDepositAsset];
                  return (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                      <h4 className="text-xl font-semibold text-white">{meta.label}</h4>
                      <p className="mt-2 text-sm text-slate-300">{meta.description}</p>
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Deposit Address</p>
                        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <code className="break-all rounded-xl bg-slate-900/90 px-3 py-2 text-sm text-slate-100">
                            {address}
                          </code>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"
                            onClick={() => handleCopyAddress(selectedDepositAsset)}
                          >
                            Copy Address
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                        {copiedAsset === selectedDepositAsset && (
                          <p className="mt-2 text-xs text-emerald-300">Address copied. Paste it in your sending wallet to proceed.</p>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-slate-400">{meta.note}</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {depositSteps.map((step) => (
                          <div key={step} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-300">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {activePanel === 'withdraw' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur px-4 py-8">
          <div className="relative w-full max-w-5xl rounded-3xl border border-amber-500/30 bg-slate-900/95 p-8 shadow-2xl shadow-amber-500/10 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={handleClosePanel}
              aria-label="Close withdrawal hub"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid gap-10 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
                  <Wallet className="h-4 w-4" />
                  Withdrawal Hub
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-amber-100">Release Profits On Demand</h3>
                  <p className="mt-3 text-sm text-slate-300">
                    Select the payout lane that fits your liquidity plan. Our treasury desk tracks confirmations in real-time and pushes status updates to your dashboard and email.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {DEPOSIT_ORDER.map((method) => {
                    const option = WITHDRAWAL_OPTIONS[method];
                    const isActive = selectedWithdrawalMethod === method;
                    return (
                      <button
                        key={`withdraw-${method}`}
                        type="button"
                        onClick={() => setSelectedWithdrawalMethod(method)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          isActive
                            ? 'border-amber-400 bg-amber-500/15 text-amber-100 shadow-lg shadow-amber-500/15'
                            : 'border-slate-800 bg-slate-950/70 text-slate-200 hover:border-amber-400/60 hover:bg-slate-900'
                        }`}
                      >
                        <p className="text-sm font-semibold">{option.label}</p>
                        <p className="mt-2 text-xs text-slate-400">{option.description}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5 text-xs text-amber-100">
                  Vault tip: include the exact receiving details to prevent compliance delays. Treasury only processes fully specified requests.
                </div>
              </div>

              <form onSubmit={handleWithdrawalSubmit} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
                <div>
                  <label className="text-sm font-semibold text-slate-200" htmlFor="withdraw-amount">
                    Withdrawal Amount (USD)
                    <input
                      id="withdraw-amount"
                      type="number"
                      min="100"
                      step="0.01"
                      value={withdrawForm.amount}
                      onChange={(event) =>
                        setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))
                      }
                      placeholder="e.g. 1250.00"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-200" htmlFor="withdraw-destination">
                    Receiving Details
                    <textarea
                      id="withdraw-destination"
                      required
                      value={withdrawForm.destination}
                      onChange={(event) =>
                        setWithdrawForm((prev) => ({ ...prev, destination: event.target.value }))
                      }
                      placeholder={WITHDRAWAL_OPTIONS[selectedWithdrawalMethod].placeholder}
                      className="mt-2 h-32 w-full resize-none rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-amber-400 hover:to-orange-400"
                >
                  Submit Withdrawal Request
                </button>

                {withdrawFeedback && (
                  <p className="text-sm text-amber-200">{withdrawFeedback}</p>
                )}
              </form>
            </div>

            {tradeJournal.length > 0 && (
              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm font-semibold text-slate-200">Latest Executions</p>
                <div className="mt-3 space-y-2">
                  {tradeJournal.slice(0, 4).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-semibold text-white">
                        {entry.strategy === 'auto' ? 'Auto' : 'Manual'} {entry.action.toUpperCase()} • {entry.symbol}
                      </span>
                      <span>
                        {formatCurrency(entry.price)} @ {entry.size.toFixed(2)}
                        {entry.result ? ` • Result ${formatCurrency(entry.result)}` : ''}
                      </span>
                      <span className="text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCoin && (
        <div className="fixed inset-0 z-[59] flex items-center justify-center bg-slate-950/90 backdrop-blur px-4 py-8">
          <div className="relative w-full max-w-4xl rounded-3xl border border-purple-500/30 bg-slate-900/95 p-8 shadow-2xl shadow-purple-500/20 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={() => {
                setSelectedCoin(null);
                setPendingAction(null);
              }}
              aria-label="Close asset detail"
            >
              <X className="h-5 w-5" />
            </button>

            {tradeFeedback && (
              <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                {tradeFeedback}
              </div>
            )}

            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <img src={selectedCoin.image} alt={`${selectedCoin.name} icon`} className="h-12 w-12 rounded-full" />
                  <div>
                    <h3 className="text-2xl font-bold text-white">{selectedCoin.name}</h3>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-400">{selectedCoin.symbol}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">Live Price</p>
                      <p className="mt-1 text-3xl font-semibold text-white">{formatCurrency(selectedCoin.current_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">24h Change</p>
                      <div
                        className={`mt-1 inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-semibold ${
                          (selectedCoin.price_change_percentage_24h ?? 0) >= 0
                            ? 'bg-green-500/15 text-green-300'
                            : 'bg-red-500/15 text-red-300'
                        }`}
                      >
                        {(selectedCoin.price_change_percentage_24h ?? 0) >= 0 ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {formatPercentage(selectedCoin.price_change_percentage_24h ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-52 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    {selectedCoinSeries.length ? (
                      <svg viewBox="0 0 560 220" width={560} height={220} role="img" aria-label={`${selectedCoin.name} technical chart`} className="h-full w-full">
                        <defs>
                          <linearGradient id="detail-area" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <path d={selectedCoinPaths.area} fill="url(#detail-area)" opacity={0.6} />
                        <path d={selectedCoinPaths.path} fill="none" stroke="#a855f7" strokeWidth={3} strokeLinecap="round" />
                      </svg>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-slate-400">Graph data unavailable</div>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Strategy Signal</p>
                    <p className="mt-2 font-semibold text-white">
                      {pendingAction && pendingAction !== 'view' ? pendingAction.toUpperCase() : 'OVERVIEW'}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Weekly engine outlook projects {weeklyPerformance}% vault profit potential on managed cycles.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Liquidity</p>
                    <p className="mt-2 font-semibold text-white">{formatCompact(selectedCoin.total_volume)} / 24h</p>
                    <p className="mt-2 text-xs text-slate-400">Spread tightening automatically hedged by our routing algorithms.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Risk Score</p>
                    <p className="mt-2 font-semibold text-white">Low Volatility</p>
                    <p className="mt-2 text-xs text-slate-400">Smart-fail safes close exposure if the drawdown threshold is met.</p>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Action Center</p>
                  <h4 className="text-xl font-semibold text-white">Deploy capital in one tap</h4>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-green-400 hover:to-emerald-400"
                    onClick={() => handleStrategyAction('buy', selectedCoin)}
                  >
                    Buy & Fund Vault
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-red-400 hover:to-orange-400"
                    onClick={() => handleStrategyAction('sell', selectedCoin)}
                  >
                    Take Profit / Withdraw
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border border-blue-500/40 px-5 py-3 text-sm font-semibold text-blue-200 transition hover:border-blue-400 hover:text-blue-100"
                    onClick={() => handleStrategyAction('auto', selectedCoin)}
                  >
                    Activate Auto Robot
                  </button>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-xs text-slate-400">
                  Automated vault cycles rebalance every 6 hours. Manual overrides available from the dashboard after funding.
                </div>
                {tradeJournal.length > 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-300">
                    <p className="text-slate-200 font-semibold">Recent Executions</p>
                    <div className="mt-2 space-y-2">
                      {tradeJournal.slice(0, 3).map((entry) => (
                        <div key={`journal-${entry.id}`} className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                          <span className="text-white font-semibold">
                            {entry.strategy === 'auto' ? 'Auto' : 'Manual'} {entry.action.toUpperCase()} • {entry.symbol}
                          </span>
                          <span>
                            {formatCurrency(entry.price)} @ {entry.size.toFixed(2)}
                            {entry.result ? ` • ${formatCurrency(entry.result)}` : ''}
                          </span>
                          <span className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showSignupFlow && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 backdrop-blur px-4 py-8">
          <div className="relative w-full max-w-2xl rounded-3xl border border-blue-500/30 bg-slate-900/95 p-8 shadow-2xl shadow-blue-500/20 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={handleCloseSignupFlow}
              aria-label="Close account setup"
            >
              <X className="h-5 w-5" />
            </button>

            {signupStep === 'credentials' && (
              <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-blue-200">
                    <User className="h-4 w-4" />
                    Create Trading Account
                  </div>
                  <h3 className="text-3xl font-bold text-white">Kickstart Your Vault Profile</h3>
                  <p className="text-slate-300">
                    Enter your credentials to receive a one-time verification code. You will confirm the code to unlock the live trading environment.
                  </p>
                </div>

                <div className="grid gap-4">
                  <label className="text-sm font-semibold text-slate-200" htmlFor="signup-name">
                    Full Name
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={signupForm.fullName}
                      onChange={(event) =>
                        setSignupForm((prev) => ({ ...prev, fullName: event.target.value }))
                      }
                      placeholder="e.g. Ava Thompson"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-200" htmlFor="signup-email">
                    Email Address
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={signupForm.email}
                      onChange={(event) =>
                        setSignupForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="you@example.com"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-200" htmlFor="signup-password">
                    Secure Password
                    <input
                      id="signup-password"
                      type="password"
                      required
                      value={signupForm.password}
                      onChange={(event) =>
                        setSignupForm((prev) => ({ ...prev, password: event.target.value }))
                      }
                      placeholder="Create a strong password"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </label>

                  <label className="text-sm font-semibold text-slate-200" htmlFor="signup-confirm">
                    Confirm Password
                    <input
                      id="signup-confirm"
                      type="password"
                      required
                      value={signupForm.confirmPassword}
                      onChange={(event) =>
                        setSignupForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      placeholder="Re-enter password"
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-3 font-semibold text-white transition hover:from-blue-400 hover:to-purple-500"
                >
                  Request Verification Code
                  <ChevronRight className="h-4 w-4" />
                </button>

                <p className="text-xs text-slate-400">
                  By continuing you accept our terms and conditions.
                </p>

                {signupMessage && <p className="text-sm text-blue-200">{signupMessage}</p>}
              </form>
            )}

            {signupStep === 'verify' && (
              <form className="space-y-6" onSubmit={handleVerifyCode}>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
                    <Mail className="h-4 w-4" />
                    Verify Email
                  </div>
                  <h3 className="text-3xl font-bold text-white">Enter the 6-Digit Code</h3>
                  <p className="text-slate-300">
                    We sent a secure code to <span className="font-semibold text-emerald-200">{signupForm.email}</span>. Paste it below to activate your trading suite.
                  </p>
                  {verificationCode && (
                    <p className="text-xs text-slate-400">
                      Demo access hint: use code <span className="font-mono text-emerald-300">{verificationCode}</span>.
                    </p>
                  )}
                </div>

                <label className="text-sm font-semibold text-slate-200" htmlFor="signup-code">
                  Verification Code
                  <input
                    id="signup-code"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={enteredCode}
                    onChange={(event) => setEnteredCode(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="mt-2 w-full rounded-xl border border-emerald-500/40 bg-slate-900/70 px-4 py-3 text-center text-2xl tracking-[0.4em] text-white focus:border-emerald-400 focus:outline-none"
                  />
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                    <button
                      type="button"
                      className="text-emerald-300 hover:text-emerald-200"
                      onClick={handleResendCode}
                    >
                      Resend code
                    </button>
                    <span className="hidden sm:inline">•</span>
                    <button
                      type="button"
                      className="text-emerald-300 hover:text-emerald-200"
                      onClick={() => {
                        setSignupMessage('');
                        setSignupStep('credentials');
                      }}
                    >
                      Update email
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-5 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-blue-400"
                  >
                    Verify & Log In
                    <KeyRound className="h-4 w-4" />
                  </button>
                </div>

                {signupMessage && <p className="text-sm text-emerald-200">{signupMessage}</p>}
              </form>
            )}

            {signupStep === 'success' && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400 bg-emerald-500/20">
                  <BadgeCheck className="h-10 w-10 text-emerald-300" />
                </div>
                <h3 className="text-3xl font-bold text-white">You&rsquo;re Verified!</h3>
                <p className="text-slate-200">
                  Welcome to the KryptoVault inner circle. Your live dashboard now reveals deposit, withdraw, and automated trading controls.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white transition hover:from-blue-400 hover:to-purple-500"
                  onClick={handleCloseSignupFlow}
                >
                  Enter Dashboard
                  <ChevronRight className="h-4 w-4" />
                </button>

                {signupMessage && <p className="text-sm text-emerald-200">{signupMessage}</p>}
              </div>
            )}
          </div>
        </div>
      )}

      {showSignInFlow && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/85 backdrop-blur px-4 py-8">
          <div className="relative w-full max-w-md rounded-3xl border border-emerald-500/30 bg-slate-900/95 p-8 shadow-2xl shadow-emerald-500/10 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={handleCloseSignInFlow}
              aria-label="Close log in"
            >
              <X className="h-5 w-5" />
            </button>

            <form className="space-y-6" onSubmit={handleSignInSubmit}>
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200">
                  <KeyRound className="h-4 w-4" />
                  Secure Log In
                </div>
                <h3 className="text-3xl font-bold text-white">Welcome back</h3>
                <p className="text-slate-300">Enter your email and password to access your live dashboard instantly.</p>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-slate-200" htmlFor="signin-email">
                  Email Address
                  <input
                    id="signin-email"
                    type="email"
                    required
                    value={signInForm.email}
                    onChange={(event) => setSignInForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="you@example.com"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </label>

                <label className="text-sm font-semibold text-slate-200" htmlFor="signin-password">
                  Password
                  <input
                    id="signin-password"
                    type="password"
                    required
                    value={signInForm.password}
                    onChange={(event) => setSignInForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Your secure password"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-5 py-3 font-semibold text-white transition hover:from-emerald-400 hover:to-blue-400"
              >
                Log In & Continue
              </button>

              {signInMessage && <p className="text-sm text-emerald-200 text-center">{signInMessage}</p>}

              <p className="text-center text-xs text-slate-400">
                Need an account?
                <button
                  type="button"
                  className="ml-2 font-semibold text-blue-300 hover:text-blue-200"
                  onClick={() => {
                    handleCloseSignInFlow();
                    window.setTimeout(() => handleOpenSignupFlow(), 200);
                  }}
                >
                  Sign Up
                </button>
              </p>
            </form>
          </div>
        </div>
      )}

      {showSimulation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm px-4 py-8">
          <div className="relative w-full max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/95 p-8 shadow-2xl shadow-blue-500/20 max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              className="absolute right-6 top-6 text-slate-400 transition hover:text-white"
              onClick={handleCloseSimulation}
              aria-label="Close trading demo"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-3 pr-8">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
                <Zap className="h-4 w-4" />
                Demo Playback
              </div>
              <h3 className="text-3xl font-bold text-white">85% Profit Smart-Trade Simulation</h3>
              <p className="text-slate-300">
                We deployed {formatCurrency(DEMO_INITIAL_CAPITAL)} in a sandbox account. One managed trading cycle compounded the balance to{' '}
                <span className="text-blue-300 font-semibold">{formatCurrency(demoTotal)}</span> in under 24 hours.
              </p>
            </div>

            <div className="mt-6 space-y-6">
              <div className="rounded-3xl border border-blue-500/40 bg-blue-500/10 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-blue-100">Entry Price: {formatCurrency(DEMO_INITIAL_CAPITAL)}</p>
                  <p className="text-sm text-blue-100">Live Price: {formatCurrency(currentSimulationPrice)}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  {simulationFullPaths.path ? (
                    <svg
                      viewBox={`0 0 ${simulationChartWidth} ${simulationChartHeight}`}
                      width={simulationChartWidth}
                      height={simulationChartHeight}
                      role="img"
                      aria-label="Smart trade simulation"
                      className="h-full w-full"
                    >
                      <defs>
                        <linearGradient id="simulation-area" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                          <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                        <clipPath id={simulationClipId}>
                          <rect x="0" y="0" width={simulationProgressWidth} height={simulationChartHeight} />
                        </clipPath>
                      </defs>
                      <path d={simulationFullPaths.area} fill="url(#simulation-area)" opacity={0.5} />
                      <path d={simulationFullPaths.path} fill="none" stroke="#64748b" strokeWidth={2} strokeLinecap="round" opacity={0.35} />
                      <g clipPath={`url(#${simulationClipId})`}>
                        <path d={simulationFullPaths.path} fill="none" stroke="#38bdf8" strokeWidth={3} strokeLinecap="round" />
                      </g>
                    </svg>
                  ) : (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-400">Simulation data unavailable</div>
                  )}
                </div>
                <div className="mt-4 flex flex-col gap-2 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                  <span>Cycle progress: {Math.min(100, Math.round((chartIndex / simulationSeries.length) * 100))}%</span>
                  <span>{chartComplete ? 'Entries closed • Profit credited to vault wallet' : 'Positions actively rebalancing...'}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Demo Capital</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(DEMO_INITIAL_CAPITAL)}</p>
                </div>
                <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-green-300">Profit {chartComplete ? 'Realized' : 'In Motion'}</p>
                  <p className="mt-2 text-xl font-semibold text-green-200">{formatCurrency(chartComplete ? demoProfit : liveProfit)}</p>
                  <p className="text-xs text-green-300">{chartComplete ? profitPercent : liveProfitPercent}% ROI</p>
                </div>
                <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-blue-200">Vault Wallet Balance</p>
                  <p className="mt-2 text-xl font-semibold text-blue-100">{formatCurrency(chartComplete ? demoTotal : currentSimulationPrice)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-400">
                Profit cycles are automatically compounded into your main vault wallet{' '}
                <span className="font-semibold text-slate-200">{DEMO_WALLET_ADDRESS}</span> once the target is achieved.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/40 transition hover:from-blue-400 hover:to-purple-500"
                  onClick={() => {
                    handleCloseSimulation();
                    window.setTimeout(() => handleOpenSignupFlow(), 200);
                  }}
                >
                  Open Live Account
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/60"
                  onClick={handleCloseSimulation}
                >
                  Close Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CryptoInvestmentPlatform;
