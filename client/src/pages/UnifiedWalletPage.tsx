import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, ArrowDownToLine, DollarSign, Lock, Wallet, RefreshCw, HelpCircle, X, ArrowRightLeft } from 'lucide-react';
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
import { formatUSDCompact, truncateText } from '@/lib/format';
// Use unified escrow snapshot (server-computed: on-chain + DB locks)
import { useEscrowSnapshot } from '../hooks/useEscrowSnapshot';
import { useUSDCBalance } from '../hooks/useUSDCBalance';
import { useWalletActivity } from '../hooks/useWalletActivity';
import DepositUSDCModal from '../components/wallet/DepositUSDCModal';
import WithdrawUSDCModal from '../components/wallet/WithdrawUSDCModal';
import ConnectWalletSheet from '../components/wallet/ConnectWalletSheet';
import { getApiUrl } from '../config';
import { useFundingModeStore } from '../store/fundingModeStore';
import { useAutoNetworkSwitch } from '../hooks/useAutoNetworkSwitch';
import { formatTxAmount, toneClass } from '@/lib/txFormat';
import { setCooldown } from '@/lib/cooldowns';

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
  const { mode, setMode, isDemoEnabled } = useFundingModeStore();
  const showDemo = isDemoEnabled;
  const isDemoMode = showDemo && mode === 'demo';
  
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

  const isLoading = loadingWalletBalance || loadingSnapshot;

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
    await Promise.all([refetchWallet(), refetchSnapshot(), refetchActivity()]);
  }, [recordOnchainTransactions, refetchWallet, refetchSnapshot, refetchActivity]);

  const handleDeposit = () => {
    if (!isConnected) {
      setShowConnectWallet(true);
    } else {
      setShowDepositModal(true);
    }
  };

  const handleWithdraw = () => {
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
        {/* Funding mode toggle (Demo only if enabled) */}
        {showDemo && (
          <div className="mb-4">
            <div className="inline-flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setMode('crypto')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  !isDemoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Crypto (USDC)
              </button>
              <button
                onClick={() => setMode('demo')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isDemoMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Demo Credits
              </button>
            </div>
          </div>
        )}

        {!isDemoMode && !isConnected ? (
          <Card>
            <CardContent>
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Connect your crypto wallet to view balances and manage funds
                </p>
                <button
                  onClick={() => setShowConnectWallet(true)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  Connect Wallet
                </button>
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

            {/* Chain Warning */}
            {!isDemoMode && !isCorrectChain && (
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
              <CardHeader title="Quick Actions" />
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
                      <span>Deposit</span>
                    </button>
                    <button
                      onClick={handleWithdraw}
                      disabled={totalUSD <= 0}
                      className="flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowDownToLine className="w-5 h-5" />
                      <span>Withdraw</span>
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
      
      {showConnectWallet && (
        <ConnectWalletSheet
          isOpen={showConnectWallet}
          onClose={() => setShowConnectWallet(false)}
        />
      )}
    </>
  );
};

export default WalletPage;
