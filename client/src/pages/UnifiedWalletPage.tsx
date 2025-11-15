import React, { useState } from 'react';
import { Plus, ArrowDownToLine, DollarSign, Lock, Wallet, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import Header from '../components/layout/Header/Header';
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

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { address, isConnected, chainId } = useAccount();
  
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
  
  // Transaction history from database
  const { data: activityData, isLoading: loadingActivity } = useWalletActivity(user?.id, 20);
  const activities = activityData?.items || [];
  
  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);

  const isLoading = loadingWalletBalance || loadingSnapshot;

  const handleRefresh = async () => {
    await Promise.all([refetchWallet(), refetchSnapshot()]);
  };

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
        <Header title="Wallet" />
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
      <Header 
        title="Wallet" 
        action={
          isConnected && (
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Refresh balances"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )
        }
      />
      
      <Page>
        {!isConnected ? (
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
            </StatRow>

            {/* Chain Warning */}
            {!isCorrectChain && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800">
                  ⚠️ Please switch to Base Sepolia network to view accurate balances and make transactions
                </p>
              </div>
            )}

            {/* Quick Actions Card */}
            <Card>
              <CardHeader title="Quick Actions" />
              <CardContent>
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
                      const isPositive =
                        activity.kind === 'deposit' ||
                        activity.kind === 'unlock' ||
                        activity.kind === 'bet_refund' ||
                        activity.kind === 'payout' ||
                        activity.kind === 'creator_fee' ||
                        activity.kind === 'platform_fee';
                      
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
                            <p className={`text-sm font-semibold ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isPositive ? '+' : '-'}{formatUSDCompact(activity.amountUSD ?? 0)}
                            </p>
                            {activity.txHash && (
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
