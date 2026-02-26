import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ArrowDownToLine, DollarSign, Lock, Wallet, RefreshCw, HelpCircle, X, ArrowRightLeft, Banknote, Gift } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import toast from 'react-hot-toast';
import AppHeader from '../components/layout/AppHeader';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent } from '../components/ui/card/Card';
import StatCard, { StatRow } from '../components/ui/card/StatCard';
import EmptyState from '../components/ui/empty/EmptyState';
import AuthRequiredState from '../components/ui/empty/AuthRequiredState';
import { SkeletonStatRow, SkeletonCard } from '../components/ui/skeleton/Skeleton';
import { formatUSDCompact, truncateText, formatCurrency } from '@/lib/format';
// Use unified escrow snapshot (server-computed: on-chain + DB locks)
import { useEscrowSnapshot } from '../hooks/useEscrowSnapshot';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useWalletActivity } from '../hooks/useWalletActivity';
import { useWalletSummary } from '../hooks/useWalletSummary';
import { useCreatorEarningsHistory, useTransferCreatorEarnings } from '../hooks/useCreatorEarningsWallet';
import DepositUSDCModal from '../components/wallet/DepositUSDCModal';
import WithdrawUSDCModal from '../components/wallet/WithdrawUSDCModal';
import ConnectWalletSheet from '../components/wallet/ConnectWalletSheet';
import { getApiUrl } from '../config';
import { useFundingModeStore } from '../store/fundingModeStore';
import { useAutoNetworkSwitch } from '../hooks/useAutoNetworkSwitch';
import { formatTxAmount, toneClass } from '@/lib/txFormat';
import { setCooldown } from '@/lib/cooldowns';
import { usePaystackStatus, useFiatSummary } from '@/hooks/useFiatWallet';
import { FiatDepositSheet } from '@/components/wallet/FiatDepositSheet';
import { FiatWithdrawalSheet } from '@/components/wallet/FiatWithdrawalSheet';
import { Runtime } from '@/config/runtime';
import { policy as storeSafePolicy } from '@/lib/storeSafePolicy';
import { resolveWalletVariant } from '@/config/walletVariant';
import { isCryptoEnabledForClient } from '@/lib/cryptoFeatureFlags';

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  // Auto-switch to Base Sepolia when connected on wrong network (crypto rail only)
  useAutoNetworkSwitch();
  const { mode, setMode, isDemoEnabled, isFiatEnabled, setFiatEnabled } = useFundingModeStore();
  const walletVariant = useMemo(() => resolveWalletVariant(), []);
  const capabilities = Runtime.capabilities;
  // Runtime wallet variant is authoritative (iOS native must default to demo).
  const showDemo = walletVariant.supportsDemo || (isDemoEnabled && capabilities.allowDemo);
  // Gate fiat/crypto modes by capabilities (crypto testnet web-only)
  const effectiveFiatEnabled = isFiatEnabled && capabilities.allowFiat;
  const effectiveCryptoEnabled = walletVariant.supportsCrypto && capabilities.allowCrypto && isCryptoEnabledForClient();
  const isDemoMode = showDemo && mode === 'demo';
  const isFiatMode = effectiveFiatEnabled && mode === 'fiat';
  const isCryptoMode = effectiveCryptoEnabled && !isDemoMode && !isFiatMode;

  // Phase 7B: In store-safe mode, force demo mode to avoid dead ends.
  useEffect(() => {
    if (!storeSafePolicy.allowCryptoWalletConnect && mode !== 'demo') {
      setMode('demo');
    }
  }, [mode, setMode]);

  // NOTE: wallet mode is enforced at bootstrap (server-authoritative),
  // not per-page. Do not force-switch here or it prevents user choice.

  // Fiat feature flag + balances (server-controlled)
  const { data: paystackStatus } = usePaystackStatus();
  const { data: fiatData, isLoading: loadingFiat, refetch: refetchFiat } = useFiatSummary(user?.id);
  useEffect(() => {
    if (paystackStatus?.enabled !== undefined) {
      setFiatEnabled(paystackStatus.enabled);
    }
  }, [paystackStatus?.enabled, setFiatEnabled]);
  
  // On-chain wallet USDC (token balance)
  const { balance: walletBalance, isLoading: loadingWalletBalance, refetch: refetchWallet } = useUSDCBalance();
  // Server-computed escrow snapshot (combines on-chain escrow + DB locks)
  const { data: snapshot, isLoading: loadingSnapshot, refetch: refetchSnapshot } = useEscrowSnapshot(user?.id, {
    walletAddress: address?.toLowerCase() ?? undefined,
    enabled: !!user?.id,
    refetchIntervalMs: 5000,
  });
  const availableUSD = snapshot?.availableToStakeUSDC ?? 0;
  const reservedUSD = snapshot?.reservedUSDC ?? 0;
  const totalUSD = snapshot?.escrowUSDC ?? 0;
  const isCorrectChain = !!chainId && chainId === baseSepolia.id;

  // Demo wallet summary (DB-backed)
  const [demoSummary, setDemoSummary] = useState<null | { currency: string; available: number; reserved: number; total: number; lastUpdated: string }>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  // Demo credits faucet cooldown (24h) - persisted per user
  const [demoNextAtMs, setDemoNextAtMs] = useState<number | null>(null);
  const [demoRemainingMs, setDemoRemainingMs] = useState<number>(0);

  const demoCooldownKey = useMemo(() => {
    return user?.id ? `fcz_demo_credits_next_at:${user.id}` : null;
  }, [user?.id]);

  const formatRemaining = useCallback((ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, []);

  useEffect(() => {
    if (!demoCooldownKey) {
      setDemoNextAtMs(null);
      setDemoRemainingMs(0);
      return;
    }
    try {
      const raw = localStorage.getItem(demoCooldownKey);
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        setDemoNextAtMs(parsed);
      } else {
        setDemoNextAtMs(null);
        setDemoRemainingMs(0);
      }
    } catch {
      setDemoNextAtMs(null);
      setDemoRemainingMs(0);
    }
  }, [demoCooldownKey]);

  useEffect(() => {
    if (!demoCooldownKey || !demoNextAtMs) {
      setDemoRemainingMs(0);
      return;
    }

    const tick = () => {
      const remaining = demoNextAtMs - Date.now();
      if (remaining <= 0) {
        setDemoRemainingMs(0);
        setDemoNextAtMs(null);
        try {
          localStorage.removeItem(demoCooldownKey);
        } catch {}
        return;
      }
      setDemoRemainingMs(remaining);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [demoCooldownKey, demoNextAtMs]);

  // Transaction history from database
  const { data: activityData, isLoading: loadingActivity, refetch: refetchActivity } = useWalletActivity(user?.id, 20);
  const { data: walletSummary, refetch: refetchWalletSummary } = useWalletSummary(user?.id, {
    walletAddress: address?.toLowerCase() ?? undefined,
    enabled: Boolean(user?.id),
    refetchIntervalMs: 30_000,
  });

  const fetchDemoSummary = useCallback(async () => {
    if (!user?.id) return;
    try {
      setDemoLoading(true);
      setDemoError(null);
      const resp = await fetch(`${getApiUrl()}/api/demo-wallet/summary?userId=${user.id}`);
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(json?.message || 'Failed to load demo wallet');
      }
      setDemoSummary(json?.summary ?? null);
    } catch (e: any) {
      setDemoError(e?.message || 'Failed to load demo wallet');
      setDemoSummary(null);
    } finally {
      setDemoLoading(false);
    }
  }, [user?.id]);

  const faucetDemo = useCallback(async () => {
    if (!user?.id) return;
    if (demoRemainingMs > 0) {
      return;
    }
    try {
      setDemoLoading(true);
      setDemoError(null);
      const resp = await fetch(`${getApiUrl()}/api/demo-wallet/faucet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(json?.message || 'Failed to faucet demo credits');
      }
      setDemoSummary(json?.summary ?? null);
      await refetchActivity();
      const nextEligibleAt = json?.nextEligibleAt ? Date.parse(String(json.nextEligibleAt)) : NaN;
      const nextAt = Number.isFinite(nextEligibleAt) ? nextEligibleAt : Date.now() + 24 * 60 * 60 * 1000;
      setDemoNextAtMs(nextAt);
      setDemoRemainingMs(nextAt - Date.now());
      if (demoCooldownKey) {
        try {
          // Persist cooldown using server-provided nextEligibleAt when possible
          if (json?.nextEligibleAt) {
            setCooldown(demoCooldownKey, String(json.nextEligibleAt));
          } else {
            localStorage.setItem(demoCooldownKey, String(nextAt));
          }
        } catch {}
      }
      if (json?.alreadyGranted) {
        toast(`Not yet available. Next request in ${formatRemaining(nextAt - Date.now())}.`, { id: 'demo-faucet', icon: '⏳' });
      } else {
        toast('Demo credits added.', { id: 'demo-faucet', icon: '✅' });
      }
    } catch (e: any) {
      setDemoError(e?.message || 'Failed to faucet demo credits');
      toast(e?.message || 'Failed to add demo credits', { id: 'demo-faucet', icon: '⚠️' });
    } finally {
      setDemoLoading(false);
    }
  }, [user?.id, refetchActivity, demoRemainingMs, demoCooldownKey]);

  useEffect(() => {
    if (isDemoMode) {
      void fetchDemoSummary();
    }
  }, [isDemoMode, fetchDemoSummary]);
  
  const activities = activityData?.items || [];
  
  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);

  const [showFiatDeposit, setShowFiatDeposit] = useState(false);
  const [showFiatWithdraw, setShowFiatWithdraw] = useState(false);
  const [showCreatorTransfer, setShowCreatorTransfer] = useState(false);
  const [showCreatorHistory, setShowCreatorHistory] = useState(false);
  const [creatorTransferAmount, setCreatorTransferAmount] = useState('');

  const { data: creatorEarningsHistory, isLoading: isLoadingCreatorHistory } = useCreatorEarningsHistory(showCreatorHistory, 20);
  const transferCreatorEarnings = useTransferCreatorEarnings();

  const isLoading = isFiatMode ? loadingFiat : (loadingWalletBalance || loadingSnapshot);
  const demoCreditsBalance = Number(walletSummary?.demoCredits ?? walletSummary?.balances?.demoCredits ?? demoSummary?.available ?? 0);
  const creatorEarningsBalance = Number(walletSummary?.creatorEarnings ?? walletSummary?.balances?.creatorEarnings ?? 0);
  const stakeBalance = Number(walletSummary?.stakeBalance ?? walletSummary?.balances?.stakeBalance ?? walletSummary?.available ?? 0);
  const parsedTransferAmount = Number.parseFloat(creatorTransferAmount || '0');
  const hasValidTransferAmount = Number.isFinite(parsedTransferAmount) && parsedTransferAmount > 0 && parsedTransferAmount <= creatorEarningsBalance;
  const previewCreatorAfter = hasValidTransferAmount ? Math.max(0, creatorEarningsBalance - parsedTransferAmount) : creatorEarningsBalance;
  const previewStakeAfter = hasValidTransferAmount ? stakeBalance + parsedTransferAmount : stakeBalance;

  const recordOnchainTransactions = useCallback(async () => {
    if (!user?.id) return;
    // Best-effort: ask the server to reconcile and record recent on-chain deposits/withdrawals into wallet_transactions
    try {
      const params = new URLSearchParams({ userId: user.id, refresh: '1' });
      if (address) params.set('walletAddress', address.toLowerCase());
      await fetch(`${getApiUrl()}/api/wallet/summary?${params.toString()}`);
    } catch (e) {
      // non-fatal: balances still come from on-chain reads
      console.warn('[wallet] recordOnchainTransactions failed (non-fatal):', e);
    }
  }, [user?.id, address]);

  const handleRefresh = useCallback(async () => {
    await recordOnchainTransactions();
    await Promise.all([refetchWallet(), refetchSnapshot(), refetchActivity(), refetchFiat(), refetchWalletSummary()]);
  }, [recordOnchainTransactions, refetchWallet, refetchSnapshot, refetchActivity, refetchFiat, refetchWalletSummary]);

  const handleSubmitCreatorTransfer = useCallback(async () => {
    if (!hasValidTransferAmount) return;
    try {
      await transferCreatorEarnings.mutateAsync(parsedTransferAmount);
      toast.success('Creator earnings moved to balance');
      setShowCreatorTransfer(false);
      setCreatorTransferAmount('');
      await Promise.all([refetchWalletSummary(), refetchActivity()]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to move creator earnings');
    }
  }, [hasValidTransferAmount, parsedTransferAmount, transferCreatorEarnings, refetchWalletSummary, refetchActivity]);

  const handleDeposit = () => {
    if (isFiatMode) {
      setShowFiatDeposit(true);
      return;
    }
    if (!isConnected) {
      setShowConnectWallet(true);
    } else {
      setShowDepositModal(true);
    }
  };

  const handleWithdraw = () => {
    if (isFiatMode) {
      setShowFiatWithdraw(true);
      return;
    }
    if (!isConnected) {
      setShowConnectWallet(true);
    } else {
      setShowWithdrawModal(true);
    }
  };

  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case 'deposit':
        return { Icon: Plus, color: 'green' };
      case 'withdraw':
        return { Icon: ArrowDownToLine, color: 'blue' };
      case 'lock':
      case 'bet_placed':
        return { Icon: Lock, color: 'orange' };
      case 'unlock':
      case 'bet_refund':
        return { Icon: RefreshCw, color: 'purple' };
      case 'payout':
        return { Icon: DollarSign, color: 'green' };
      case 'creator_fee':
        return { Icon: DollarSign, color: 'emerald' };
      case 'platform_fee':
        return { Icon: DollarSign, color: 'indigo' };
      default:
        return { Icon: DollarSign, color: 'gray' };
    }
  };

  const getActivityLabel = (kind: string) => {
    switch (kind) {
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdrawal';
      case 'lock':
        return 'Funds Reserved';
      case 'unlock':
        return 'Funds Released';
      case 'bet_placed':
        return 'Stake Placed';
        return 'Bet Placed';
      case 'bet_refund':
        return 'Bet Refunded';
      case 'payout':
        return 'Payout';
      case 'creator_fee':
        return 'Creator Earnings';
      case 'platform_fee':
        return 'Platform Fee';
      default:
        return kind.replace(/_/g, ' ');
    }
  };

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <>
        <AppHeader title="Wallet" />
        <Page>
          <AuthRequiredState
            icon={<DollarSign />}
            title="Sign in to view your wallet"
            description="Manage your funds and transaction history."
            intent="view_wallet"
          />
        </Page>
      </>
    );
  }

  return (
    <>
      <AppHeader 
        title="Wallet" 
        // Keep title visually centered even when there are multiple right-side actions.
        left={isConnected ? <div className="w-[72px]" /> : undefined}
        action={
          isConnected ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors disabled:opacity-50"
                aria-label="Refresh balances"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => disconnect()}
                className="rounded-full p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Disconnect wallet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : null
        }
      />
      
      <Page>
        {/* Funding mode toggle: show only when we have multiple supported modes */}
        {((showDemo && effectiveCryptoEnabled) || (effectiveFiatEnabled && (showDemo || effectiveCryptoEnabled))) && (
          <div className="mb-4">
            <div className="inline-flex rounded-lg bg-gray-100 p-1 flex-wrap gap-1">
              {effectiveCryptoEnabled && (
                <button
                  onClick={() => setMode('crypto')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isCryptoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Crypto (USDC)
                </button>
              )}
              {showDemo && (
                <button
                  onClick={() => setMode('demo')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isDemoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Demo Credits
                </button>
              )}
              {effectiveFiatEnabled && (
                <button
                  onClick={() => setMode('fiat')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isFiatMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Fiat (NGN)
                </button>
              )}
            </div>
            {Runtime.storeSafeMode && (
              <p className="mt-2 text-xs text-gray-500">Demo Mode</p>
            )}
          </div>
        )}

        {isCryptoMode && !isConnected ? (
          <Card>
            <CardContent>
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {storeSafePolicy.allowCryptoWalletConnect ? 'Connect Your Wallet' : 'Demo Mode'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {storeSafePolicy.allowCryptoWalletConnect 
                    ? 'Connect your crypto wallet to view balances and manage funds'
                    : 'Crypto wallet features are not available in this build. Use demo credits to explore predictions.'}
                </p>
                {storeSafePolicy.allowCryptoWalletConnect ? (
                  <button
                    onClick={() => setShowConnectWallet(true)}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    onClick={() => setMode('demo')}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                  >
                    Switch to Demo Mode
                  </button>
                )}
                {/* Funding Guide Link */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Don't have a wallet yet?</p>
                  <a
                    href="https://fanclubz.app/docs/funding-guide"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span>Learn how to get started</span>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <>
            <SkeletonStatRow />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Balance Overview */}
            <StatRow>
              {isDemoMode ? (
                <>
                  <StatCard
                    label="Demo Credits"
                    value={demoSummary?.total ?? 0}
                    variant="currency"
                    icon={<Wallet className="w-4 h-4" />}
                    subtitle="Total"
                  />
                  <StatCard
                    label="Available"
                    value={demoSummary?.available ?? 0}
                    variant="currency"
                    icon={<DollarSign className="w-4 h-4" />}
                    subtitle="Ready to stake"
                  />
                  <StatCard
                    label="In Bets"
                    value={demoSummary?.reserved ?? 0}
                    variant="currency"
                    icon={<Lock className="w-4 h-4" />}
                    subtitle="Currently locked"
                  />
                </>
              ) : isFiatMode ? (
                <>
                  <StatCard
                    label="Fiat Wallet"
                    value={fiatData?.summary?.totalNgn ?? 0}
                    variant="currency"
                    currency="NGN"
                    compact
                    icon={<Banknote className="w-4 h-4" />}
                    subtitle="Total"
                  />
                  <StatCard
                    label="Available"
                    value={fiatData?.summary?.availableNgn ?? 0}
                    variant="currency"
                    currency="NGN"
                    compact
                    icon={<DollarSign className="w-4 h-4" />}
                    subtitle="Ready to stake"
                  />
                  <StatCard
                    label="In Bets"
                    value={fiatData?.summary?.lockedNgn ?? 0}
                    variant="currency"
                    currency="NGN"
                    compact
                    icon={<Lock className="w-4 h-4" />}
                    subtitle="Currently locked"
                  />
                </>
              ) : (
                <>
                  <StatCard 
                    label="Wallet Balance" 
                    value={walletBalance || 0} 
                    variant="currency"
                    icon={<Wallet className="w-4 h-4" />}
                    subtitle="USDC on Base"
                  />
                  <StatCard 
                    label="Available" 
                    value={availableUSD} 
                    variant="currency"
                    icon={<DollarSign className="w-4 h-4" />}
                    subtitle="Ready to stake"
                  />
                  <StatCard 
                    label="In Bets" 
                    value={reservedUSD}
                    variant="currency"
                    icon={<Lock className="w-4 h-4" />}
                    subtitle="Currently locked"
                  />
                </>
              )}
            </StatRow>

            {/* Creator earnings (explicit internal balance, near top) */}
            <Card>
              <CardHeader title="Creator Earnings" />
              <CardContent>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-amber-700">Available creator earnings</p>
                      <p className="mt-1 text-2xl font-semibold text-amber-900 font-mono">
                        {formatCurrency(creatorEarningsBalance, { compact: false })}
                      </p>
                      <p className="mt-1 text-xs text-amber-700/80">
                        Earnings from creator activity. Move to balance to use for staking.
                      </p>
                    </div>
                    <Gift className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCreatorTransferAmount('');
                        setShowCreatorTransfer(true);
                      }}
                      disabled={creatorEarningsBalance <= 0}
                      className="inline-flex items-center justify-center rounded-lg bg-amber-200 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Move to Balance
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreatorHistory(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100/40"
                    >
                      View history
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                    <div className="flex items-center justify-between sm:block">
                      <p className="text-gray-500 text-xs">Demo Credits</p>
                      <p className="font-mono font-medium text-gray-900">{formatCurrency(demoCreditsBalance, { compact: false })}</p>
                    </div>
                    <div className="flex items-center justify-between sm:block">
                      <p className="text-gray-500 text-xs">Wallet / Stake Balance</p>
                      <p className="font-mono font-medium text-gray-900">{formatCurrency(stakeBalance, { compact: false })}</p>
                    </div>
                    <div className="flex items-center justify-between sm:block">
                      <p className="text-gray-500 text-xs">Creator Earnings</p>
                      <p className="font-mono font-semibold text-amber-700">{formatCurrency(creatorEarningsBalance, { compact: false })}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase 7D: FX USD estimates (display-only) */}
            {isFiatMode && (
              <div className="mt-3 mb-1 px-1">
                {(() => {
                  const fx = fiatData?.fx;
                  const usdEst = fiatData?.summary?.usdEstimate;
                  const fxOk = fx && fx.rate != null && !fx.isStale && Number.isFinite(usdEst);
                  const totalUsdEst = fxOk && isConnected
                    ? (usdEst ?? 0) + (snapshot?.availableToStakeUSDC ?? 0)
                    : fxOk ? (usdEst ?? 0) : null;
                  const asOf = fx?.asOf ? new Date(fx.asOf).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null;
                  const retrievedAt = fx?.retrievedAt ? new Date(fx.retrievedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null;
                  return (
                    <div className="space-y-1 text-xs text-gray-500">
                      {fxOk ? (
                        <>
                          <p>
                            Approx. available ≈ {formatCurrency(usdEst!, { compact: false, currency: 'USD' })}
                            {asOf ? ` · Rate as of ${asOf}` : ''}
                            {fx?.source ? ` · Source ${fx.source}` : ''}
                            {retrievedAt ? ` · Updated ${retrievedAt}` : ''}
                          </p>
                          {totalUsdEst != null && (
                            <p className="font-medium text-gray-700">Total (USD est.) ≈ {formatCurrency(totalUsdEst, { compact: false, currency: 'USD' })}</p>
                          )}
                        </>
                      ) : (
                        <p>Rates temporarily unavailable</p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Chain Warning */}
            {isCryptoMode && !isCorrectChain && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-amber-800">
                    ⚠️ Please switch to Base Sepolia network to view accurate balances and make transactions
                  </p>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => switchChain({ chainId: baseSepolia.id })}
                      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      Switch
                    </button>
                  )}
                </div>
              </div>
            )}

            {isDemoMode && demoError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800">{demoError}</p>
              </div>
            )}

            {/* Quick Actions Card */}
            <Card>
              <CardContent>
                {isDemoMode ? (
                  <div className="grid grid-cols-1 gap-4">
                    <button
                      onClick={faucetDemo}
                      disabled={demoLoading || demoRemainingMs > 0}
                      className="flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-4 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-5 h-5" />
                      <span>
                        {demoRemainingMs > 0
                          ? `Next credits in ${formatRemaining(demoRemainingMs)}`
                          : 'Get Demo Credits'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleDeposit}
                      className="flex items-center justify-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-4 rounded-xl transition-colors font-medium"
                    >
                      <Plus className="w-5 h-5" />
                      <span>{isFiatMode ? 'Deposit NGN' : 'Deposit'}</span>
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={isFiatMode ? (Number(fiatData?.summary?.availableNgn ?? 0) <= 0) : (totalUSD <= 0)}
                      className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownToLine className="w-5 h-5" />
                      <span>{isFiatMode ? 'Withdraw NGN' : 'Withdraw'}</span>
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction History Card */}
            <Card>
              <CardHeader title="Recent Activity" />
              <CardContent>
                {loadingActivity ? (
                  <div className="text-center py-6">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Loading activity...</p>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.map((activity) => {
                      const { Icon, color } = getActivityIcon(activity.kind);
                      const tx = formatTxAmount({
                        amount: activity.amountUSD ?? 0,
                        kind: activity.kind,
                        compact: true,
                        currency: (activity as any)?.meta?.currency || 'USD',
                      });
                      
                      return (
                        <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${color}-100 text-${color}-600`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {getActivityLabel(activity.kind)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${toneClass(tx.tone)}`}>
                              {tx.display}
                            </p>
                            {activity.txHash && /^0x[a-fA-F0-9]{64}$/.test(String(activity.txHash)) && (
                              <a
                                href={`https://sepolia.basescan.org/tx/${activity.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                View tx
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <EmptyState
                      title="No activity yet"
                      description="Your transaction history will appear here."
                      primaryAction={
                        <button
                          onClick={handleDeposit}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Make Your First Deposit
                        </button>
                      }
                    />
                    {/* Funding Guide Link */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 mb-2">New to crypto wallets?</p>
                      <a
                        href="https://fanclubz.app/docs/funding-guide"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>Learn how to fund your wallet</span>
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Page>

      {/* Modals */}
      {showDepositModal && user?.id && (
        <DepositUSDCModal
          open={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => {
            setShowDepositModal(false);
            handleRefresh();
          }}
          availableUSDC={walletBalance || 0}
          userId={user.id}
        />
      )}
      
      {showWithdrawModal && user?.id && (
        <WithdrawUSDCModal
          open={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            handleRefresh();
          }}
          availableUSDC={availableUSD}
          userId={user.id}
        />
      )}

      {/* Fiat sheets (NGN) - gated by capabilities AND store-safe policy */}
      {effectiveFiatEnabled && user?.id && capabilities.allowFiat && storeSafePolicy.allowFiatPayments && (
        <>
          <FiatDepositSheet open={showFiatDeposit} onClose={() => setShowFiatDeposit(false)} userId={user.id} userEmail={user.email} />
          <FiatWithdrawalSheet
            open={showFiatWithdraw}
            onClose={() => setShowFiatWithdraw(false)}
            userId={user.id}
            fiatSummary={fiatData?.summary ?? null}
          />
        </>
      )}

      {showCreatorTransfer && (
        <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreatorTransfer(false)} />
          <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-5 z-[1] mb-[calc(72px+env(safe-area-inset-bottom,0px))] pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Creator Earnings</p>
                <h3 className="text-lg font-semibold text-gray-900">Move to Balance</h3>
              </div>
              <button
                className="p-2 rounded-full hover:bg-gray-100"
                onClick={() => setShowCreatorTransfer(false)}
                aria-label="Close transfer"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-3 mb-4">
              <p className="text-xs text-amber-700">Available creator earnings</p>
              <p className="text-xl font-semibold text-amber-900 font-mono">{formatCurrency(creatorEarningsBalance, { compact: false })}</p>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-gray-700">Amount</span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={creatorTransferAmount}
                    onChange={(e) => setCreatorTransferAmount(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() => setCreatorTransferAmount(creatorEarningsBalance > 0 ? creatorEarningsBalance.toFixed(2) : '0')}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Max
                  </button>
                </div>
              </label>
              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Preview</p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Creator Earnings after</span>
                    <span className="font-mono text-gray-900">{formatCurrency(previewCreatorAfter, { compact: false })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Wallet / Stake Balance after</span>
                    <span className="font-mono text-gray-900">{formatCurrency(previewStakeAfter, { compact: false })}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSubmitCreatorTransfer}
                disabled={!hasValidTransferAmount || transferCreatorEarnings.isPending}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {transferCreatorEarnings.isPending ? 'Moving…' : 'Confirm Move'}
              </button>
              {!hasValidTransferAmount && creatorTransferAmount.trim().length > 0 && (
                <p className="text-xs text-rose-600">Amount must be greater than 0 and no more than your creator earnings.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreatorHistory && (
        <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreatorHistory(false)} />
          <div className="relative w-full md:max-w-lg bg-white rounded-t-2xl md:rounded-2xl shadow-xl p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] mb-[calc(72px+env(safe-area-inset-bottom,0px))] max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur px-4 pt-2 pb-3 -mx-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Creator Earnings History</h3>
              <button
                className="p-1.5 rounded-lg hover:bg-gray-100"
                onClick={() => setShowCreatorHistory(false)}
                aria-label="Close creator earnings history"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            {isLoadingCreatorHistory ? (
              <div className="p-4 text-sm text-gray-500">Loading earnings history…</div>
            ) : !(creatorEarningsHistory?.items?.length) ? (
              <div className="p-4 text-sm text-gray-500">No creator earnings activity yet.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {creatorEarningsHistory.items.map((item) => {
                  const isTransfer = item.eventType === 'CREATOR_EARNING_TRANSFER';
                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isTransfer ? 'Moved to Balance' : 'Creator Earnings Credit'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.description || (isTransfer ? 'Creator earnings transfer' : 'Settlement creator fee')}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {new Date(item.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`font-mono text-sm font-semibold ${isTransfer ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {isTransfer ? '-' : '+'}{formatCurrency(item.amount, { compact: false })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Connect wallet - gated by capabilities */}
      {showConnectWallet && capabilities.allowCrypto && (
        <ConnectWalletSheet
          isOpen={showConnectWallet}
          onClose={() => setShowConnectWallet(false)}
        />
      )}
    </>
  );
};

export default WalletPage;
