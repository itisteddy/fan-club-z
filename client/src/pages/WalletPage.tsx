import React, { useState, useEffect } from 'react';
import { Plus, Download, DollarSign, TrendingUp, CreditCard } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { useAuthSession } from '../providers/AuthSessionProvider';
import { useLocation } from 'wouter';
import { openAuthGate } from '../auth/authGateAdapter';
import AppHeader from '../components/layout/AppHeader';
import toast from 'react-hot-toast';

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const { user: storeUser, isAuthenticated: storeAuthenticated } = useAuthStore();
  const { user: sessionUser, initialized: sessionInitialized } = useAuthSession();
  const { getBalance, getTransactionHistory, addFunds, initializeWallet } = useWalletStore();
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Use session as source of truth for authentication, fallback to store
  const isAuthenticated = sessionUser ? true : storeAuthenticated;
  const user = sessionUser ? {
    id: sessionUser.id,
    firstName: sessionUser.user_metadata?.firstName || sessionUser.user_metadata?.first_name || sessionUser.user_metadata?.full_name?.split(' ')[0] || 'User',
    lastName: sessionUser.user_metadata?.lastName || sessionUser.user_metadata?.last_name || sessionUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
    email: sessionUser.email || '',
    phone: sessionUser.phone,
    avatar: sessionUser.user_metadata?.avatar_url || sessionUser.user_metadata?.picture,
    provider: sessionUser.app_metadata?.provider || 'email',
    createdAt: sessionUser.created_at
  } : storeUser;

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initializeWallet();
      setLoading(false);
    } else if (!isAuthenticated) {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id, initializeWallet]);

  // Get wallet data
  const balance = getBalance('USD') || 0;
  const transactions = getTransactionHistory({ currency: 'USD' }) || [];
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);
  const transactionCount = transactions.length;

  // Recent transactions (last 5)
  const recentTransactions = transactions
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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

  const handleBackClick = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else {
      setLocation('/');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader title="Wallet" />
        <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="mb-4 text-gray-300">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your wallet</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm">See your balance, deposits, and transactions.</p>
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
      <AppHeader title="Wallet" />
      
      <div className="mx-auto w-full max-w-[720px] lg:max-w-[960px] px-4 py-4">
        <div className="space-y-4">
          {loading ? (
            <>
              {/* Loading Skeleton */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2 w-2/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Stat Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Net Profit</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {formatCurrency(balance - totalDeposits)}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <Download className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Deposits</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {formatCurrency(totalDeposits)}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4 min-h-[88px] flex flex-col justify-center">
                  <div className="flex items-center space-x-1 mb-2">
                    <DollarSign className="w-4 h-4 text-gray-500" />
                    <div className="text-xs text-gray-600 font-medium">Transactions</div>
                  </div>
                  <div className="text-xl font-semibold text-gray-900 font-mono">
                    {transactionCount}
                  </div>
                </div>
              </div>

              {/* Overview Card */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Overview</h3>
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <div className="text-3xl font-bold text-gray-900 mb-2">
                      {formatCurrency(balance)}
                    </div>
                    <div className="text-sm text-gray-600 mb-4">
                      Available Balance
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleAddFunds(100)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Funds</span>
                    </button>
                    <button
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      disabled
                    >
                      <Download className="w-4 h-4" />
                      <span>Withdraw</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent Activity Card */}
              <div className="bg-white rounded-2xl border border-black/[0.06] p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {transaction.type === 'deposit' ? (
                              <Plus className="w-4 h-4 text-green-600" />
                            ) : (
                              <Download className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.description || 
                                (transaction.type === 'deposit' ? 'Funds Added' : 'Withdrawal')
                              }
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${
                            transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {transaction.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No transactions yet</p>
                    <p className="text-sm mb-4">Your transaction history will appear here.</p>
                    <button
                      onClick={() => handleAddFunds(100)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                    >
                      Add Your First Funds
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
