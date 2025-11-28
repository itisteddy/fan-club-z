import React, { useState } from 'react';
import { Plus, ArrowDownToLine, DollarSign, Lock, Wallet, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAccount } from 'wagmi';
import { useLocation } from 'wouter';
import { openAuthGate } from '../../auth/authGateAdapter';
import AppHeader from '../../components/layout/AppHeader';
import { formatCurrency } from '@/lib/format';
import { useEscrowBalance } from '../../hooks/useEscrowBalance';
import { useUSDCBalance } from '../../hooks/useUSDCBalance';
import { useWalletActivity, WalletActivityItem } from '../../hooks/useWalletActivity';
import DepositUSDCModal from '../../components/wallet/DepositUSDCModal';
import WithdrawUSDCModal from '../../components/wallet/WithdrawUSDCModal';
import ConnectWalletSheet from '../../components/wallet/ConnectWalletSheet';

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { address, isConnected } = useAccount();
  const [, setLocation] = useLocation();
  
  // On-chain balance hooks
  const { balance: walletBalance, isLoading: loadingWalletBalance, refetch: refetchWallet } = useUSDCBalance();
  const { 
    availableUSD, 
    reservedUSD, 
    totalUSD, 
    isLoading: loadingEscrow,
    refetch: refetchEscrow,
    isCorrectChain 
  } = useEscrowBalance();
  
  // Transaction history from database
  const { data: activityData, isLoading: loadingActivity } = useWalletActivity(user?.id, 10);
  const activities = activityData?.items || [];
  
  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showConnectWallet, setShowConnectWallet] = useState(false);

  const isLoading = loadingWalletBalance || loadingEscrow;

  const handleRefresh = async () => {
    await Promise.all([refetchWallet(), refetchEscrow()]);
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

  const handleBackClick = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      setLocation('/');
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
      case 'unlock':
        return 'Funds Released';
      case 'lock':
        return 'Funds Reserved';
      default:
        return kind.replace(/_/g, ' ');
    }
  };

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Wallet" />
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="mb-4 text-gray-300">
              <DollarSign className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your wallet</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm">Manage your funds and view transactions.</p>
            <button
              onClick={async () => {
                try {
                  await openAuthGate({ intent: 'view_wallet' });
                } catch (error) {
                  console.error('Auth gate error:', error);
                }
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader 
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
      
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
        <div className="space-y-4">
          {!isConnected ? (
            <div className="bg-white rounded-2xl border border-black/[0.06] p-6">
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
            </div>
          ) : isLoading ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Chain Warning */}
              {!isCorrectChain && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800">
                    ⚠️ Please switch to Base Sepolia network
                  </p>
                </div>
              )}

              {/* Balance Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Wallet className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Wallet</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {formatCurrency(walletBalance || 0, 'USD', true)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">USDC on Base</div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Available</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {formatCurrency(availableUSD, 'USD', true)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Ready to stake</div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">In Bets</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {formatCurrency(reservedUSD, 'USD', true)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Currently locked</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDeposit}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deposit</span>
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={totalUSD <= 0}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Withdraw</span>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {loadingActivity ? (
                  <div className="text-center py-6">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">Loading activity...</p>
                  </div>
                ) : activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity: WalletActivityItem) => {
                      const { Icon, color } = getActivityIcon(activity.kind);
                      const isPositive =
                        activity.kind === 'deposit' ||
                        activity.kind === 'unlock' ||
                        activity.kind === 'bet_refund' ||
                        activity.kind === 'payout' ||
                        activity.kind === 'creator_fee' ||
                        activity.kind === 'platform_fee';
                      
                      return (
                        <div key={activity.id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-${color}-100`}>
                              <Icon className={`w-4 h-4 text-${color}-600`} />
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
                            <div className={`text-sm font-medium ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isPositive ? '+' : '-'}{formatCurrency(activity.amountUSD ?? 0, 'USD', true)}
                            </div>
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
                  <div className="text-center py-8 text-gray-500">
                    <p>No transactions yet</p>
                    <p className="text-sm mb-4">Your transaction history will appear here.</p>
                    <button
                      onClick={handleDeposit}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                      Make Your First Deposit
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {showDepositModal && (
        <DepositUSDCModal
          open={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onSuccess={() => {
            setShowDepositModal(false);
            handleRefresh();
          }}
        />
      )}
      
      {showWithdrawModal && (
        <WithdrawUSDCModal
          open={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            handleRefresh();
          }}
          availableUSDC={availableUSD}
        />
      )}
      
      {showConnectWallet && (
        <ConnectWalletSheet
          isOpen={showConnectWallet}
          onClose={() => setShowConnectWallet(false)}
        />
      )}
    </div>
  );
};

export default WalletPage;
