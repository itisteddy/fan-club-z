import React, { useState, useEffect } from 'react';
import { Plus, Download, DollarSign, TrendingUp, CreditCard, User, Wallet } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { openAuthGate } from '../auth/authGateAdapter';
import AppHeader from '../components/layout/AppHeader';
import toast from 'react-hot-toast';
import { formatCurrency, formatLargeNumber, formatPercentage } from '@lib/format';
import SignedOutGateCard from '../components/auth/SignedOutGateCard';
import DepositUSDCModal from '../components/wallet/DepositUSDCModal';
import WithdrawUSDCModal from '../components/wallet/WithdrawUSDCModal';
import { selectOverviewBalances, selectEscrowAvailableUSD } from '../lib/balance/balanceSelector';
import { useOnchainActivity } from '../hooks/useOnchainActivity';

interface WalletPageV2Props {
  onNavigateBack?: () => void;
}

const WalletPageV2: React.FC<WalletPageV2Props> = ({ onNavigateBack }) => {
  const { user: sessionUser } = useAuthSession();
  const { user: storeUser, isAuthenticated: storeAuth } = useAuthStore();
  const walletStore = useWalletStore();
  const { getBalance, getTransactionHistory, addFunds, initializeWallet } = walletStore;
  const [loading, setLoading] = useState(true);
  
  // Crypto wallet modal state
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  
  // On-chain balances and activity
  const { walletUSDC, escrowUSDC, escrowAvailableUSDC } = selectOverviewBalances(walletStore);
  const { data: onchainActivity = [] } = useOnchainActivity(user?.id);

  // Determine user context - prioritize session user
  const user = sessionUser || storeUser;
  const authenticated = !!sessionUser || storeAuth;

  useEffect(() => {
    if (authenticated && user?.id) {
      initializeWallet();
      setLoading(false);
    } else if (!authenticated) {
      setLoading(false);
    }
  }, [authenticated, user?.id, initializeWallet]);

  // Get wallet data
  const balance = getBalance('USD') || 0;
  const transactions = getTransactionHistory({ currency: 'USD' }) || [];
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = transactions.length;


  // Recent transactions (last 5)
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleAddFunds = async (amount: number) => {
    try {
      await addFunds(amount, 'USD', 'Demo funds added');
      toast.success(`Successfully added $${amount.toLocaleString()} to your wallet!`);
    } catch (error) {
      console.error('Failed to add funds:', error);
      toast.error('Failed to add funds. Please try again.');
    }
  };

  // Remove the local formatter since we're using the imported one

  // Handle authentication required - NO UPSELL, clean experience
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <AppHeader title="Wallet" />
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
          {/* Same visual structure as authenticated, but with placeholders */}
          <div className="space-y-4">
            {/* Empty Stat Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <TrendingUp className="w-4 h-4 text-gray-300" />
                  <div className="text-xs text-gray-400 font-medium">Net Profit</div>
                </div>
                <div className="text-xl font-semibold text-gray-300 font-mono">--</div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <Download className="w-4 h-4 text-gray-300" />
                  <div className="text-xs text-gray-400 font-medium">Deposits</div>
                </div>
                <div className="text-xl font-semibold text-gray-300 font-mono">--</div>
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                <div className="flex items-center space-x-1 mb-2">
                  <DollarSign className="w-4 h-4 text-gray-300" />
                  <div className="text-xs text-gray-400 font-medium">Transactions</div>
                </div>
                <div className="text-xl font-semibold text-gray-300 font-mono">--</div>
              </div>
            </div>

            {/* Overview Card - Clean signed-out state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Overview</h3>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view wallet</h4>
                <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
                  Track your balance, deposits, and transaction history.
                </p>
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

            {/* Recent Activity Card - Empty state */}
            <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate professional KPIs
  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdraw')
    .reduce((sum, t) => sum + t.amount, 0);
  const netProfit = balance - totalDeposits;
  const returnPercentage = totalDeposits > 0 ? (netProfit / totalDeposits) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <AppHeader title="Wallet" />
      
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
        <div className="space-y-4">
          {loading ? (
            <>
              {/* Professional Loading Skeleton */}
              <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                    <div className="h-3 bg-gray-200 rounded mb-2 w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
                <div className="text-center py-6">
                  <div className="h-8 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 mx-auto mb-4"></div>
                  <div className="flex space-x-3">
                    <div className="flex-1 h-12 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 h-12 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Professional Stat Row - Handles lengthy figures cleanly */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <TrendingUp className={`w-4 h-4 ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Net Return</div>
                  </div>
                  <div className={`text-lg font-bold font-mono truncate ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(netProfit, { compact: true, showSign: true })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatPercentage(returnPercentage)} ROI
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Total In</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono truncate">
                    {formatCurrency(totalDeposits, { compact: true })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {transactions.filter(t => t.type === 'deposit').length} deposits
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <CreditCard className="w-4 h-4 text-purple-500" />
                    <div className="text-xs text-gray-600 font-medium tracking-wide">Activity</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 font-mono truncate">
                    {formatLargeNumber(transactionCount)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    transactions
                  </div>
                </div>
              </div>

              {/* On-chain Balance Card (Base Sepolia) */}
              {(escrowUSDC > 0 || walletUSDC > 0) && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">On-chain Balance</h3>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                      Base Sepolia
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    {/* Wallet USDC */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">Wallet USDC</span>
                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">ERC20</span>
                      </div>
                      <span className="text-base font-bold text-gray-900 font-mono">
                        ${walletUSDC.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Escrow USDC */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">Escrow USDC</span>
                      </div>
                      <span className="text-base font-bold text-gray-900 font-mono">
                        ${escrowUSDC.toFixed(2)}
                      </span>
                    </div>
                    
                    {/* Available to Stake */}
                    <div className="flex items-center justify-between pt-2 border-t border-blue-100">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-gray-900">Available to stake</span>
                      </div>
                      <span className="text-lg font-bold text-emerald-600 font-mono">
                        ${escrowAvailableUSDC.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setShowDeposit(true)}
                      className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-200"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Deposit</span>
                    </button>
                    <button
                      onClick={() => setShowWithdraw(true)}
                      className="flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                      disabled={escrowAvailableUSDC === 0}
                    >
                      <Download className="w-4 h-4" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Overview Card - Professional balance display with intent handoff */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Overview</h3>
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2 font-mono">
                      {formatCurrency(balance, { compact: balance > 10000 })}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      Available Balance
                    </div>
                    {balance > 0 && (
                      <div className="text-xs text-gray-500">
                        Ready for predictions
                      </div>
                    )}
                  </div>
                  
                  {/* Action buttons with proper intent handoff */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleAddFunds(100)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Quick Add</span>
                    </button>
                    <button
                      onClick={async () => {
                        // Intent handoff to withdrawal flow
                        try {
                          await openAuthGate({ intent: 'view_wallet' });
                          // TODO: Open withdrawal modal when implemented
                          toast('Withdrawal coming soon!', { icon: '⏳' });
                        } catch (error) {
                          console.error('Withdraw intent error:', error);
                        }
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-200"
                      disabled={balance === 0}
                    >
                      <Download className="w-4 h-4" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                  
                  {balance === 0 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        Add funds to start making predictions
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity Card - Enhanced transaction display */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                  {recentTransactions.length > 0 && (
                    <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                      View All
                    </button>
                  )}
                </div>
                
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => {
                      const isCredit = transaction.type === 'deposit';
                      const amount = Math.abs(transaction.amount);
                      
                      return (
                        <div key={transaction.id} className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isCredit ? 'bg-emerald-100' : 'bg-red-100'
                            }`}>
                              {isCredit ? (
                                <Plus className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Download className="w-4 h-4 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.description || 
                                  (isCredit ? 'Funds Added' : 'Withdrawal')
                                }
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0">
                            <div className={`text-sm font-semibold font-mono ${
                              isCredit ? 'text-emerald-600' : 'text-red-600'
                            }`}>
                              {isCredit ? '+' : '-'}{formatCurrency(amount, { compact: amount > 1000 })}
                            </div>
                            <div className={`text-xs font-medium ${
                              transaction.status === 'completed' ? 'text-gray-500' : 
                              transaction.status === 'pending' ? 'text-yellow-600' :
                              'text-red-500'
                            }`}>
                              {transaction.status}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CreditCard className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-900 font-medium mb-1">No transactions yet</p>
                    <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
                      Your transaction history will appear here as you add funds and make predictions.
                    </p>
                    <button
                      onClick={() => handleAddFunds(100)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors text-sm"
                    >
                      Add Funds
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Crypto Wallet Modals */}
      {user?.id && (
        <>
          <DepositUSDCModal
            open={showDeposit}
            onClose={() => setShowDeposit(false)}
            availableUSDC={walletUSDC}
            userId={user.id}
          />
          <WithdrawUSDCModal
            open={showWithdraw}
            onClose={() => setShowWithdraw(false)}
            availableUSDC={escrowAvailableUSDC}
            userId={user.id}
          />
        </>
      )}
    </div>
  );
};

export default WalletPageV2;
