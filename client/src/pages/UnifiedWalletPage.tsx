import React, { useState, useEffect } from 'react';
import { Plus, ArrowDownToLine, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';
import { openAuthGate } from '../auth/authGateAdapter';
import Header from '../components/layout/Header/Header';
import Page from '../components/ui/layout/Page';
import Card, { CardHeader, CardContent, CardActions } from '../components/ui/card/Card';
import StatCard, { StatRow } from '../components/ui/card/StatCard';
import EmptyState from '../components/ui/empty/EmptyState';
import { SkeletonStatRow, SkeletonCard } from '../components/ui/skeleton/Skeleton';
import { formatUSDCompact, truncateText } from '../utils/formatters';

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const { user, isAuthenticated } = useAuthStore();
  const { balance, transactions, getTransactionHistory, depositFunds, withdrawFunds } = useWalletStore();
  const [loading, setLoading] = useState(!isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      setLoading(false);
      // Load transaction history
      getTransactionHistory();
    }
  }, [isAuthenticated, user?.id, getTransactionHistory]);

  // Calculate wallet stats with enhanced formatting
  const recentTransactions = transactions?.slice(0, 10) || [];
  const totalDeposits = transactions?.filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const totalWithdrawals = transactions?.filter(t => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0) || 0;
  const transactionCount = transactions?.length || 0;

  const handleDeposit = async () => {
    try {
      // Open deposit modal or redirect to payment processor
      console.log('Opening deposit modal...');
    } catch (error) {
      console.error('Deposit error:', error);
    }
  };

  const handleWithdraw = async () => {
    try {
      // Open withdraw modal
      console.log('Opening withdraw modal...');
    } catch (error) {
      console.error('Withdraw error:', error);
    }
  };

  // Handle authentication required
  if (!isAuthenticated) {
    return (
      <>
        <Header title="Wallet" />
        <Page>
          <EmptyState
            icon={<DollarSign />}
            title="Sign in to view your wallet"
            description="Manage your funds and transaction history."
            primaryAction={
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
            }
          />
        </Page>
      </>
    );
  }

  return (
    <>
      <Header title="Wallet" />
      
      <Page>
        {loading ? (
          <>
            <SkeletonStatRow />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {/* Stat Row with Enhanced Formatting */}
            <StatRow>
              <StatCard 
                label="Total Balance" 
                value={balance || 0} 
                variant="currency"
                icon={<DollarSign className="w-4 h-4" />}
              />
              <StatCard 
                label="Total Deposits" 
                value={totalDeposits}
                variant="currency"
                icon={<TrendingUp className="w-4 h-4" />}
              />
              <StatCard 
                label="Transactions" 
                value={transactionCount}
                variant="count"
                icon={<Clock className="w-4 h-4" />}
              />
            </StatRow>

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
                    <span>Add Funds</span>
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={!balance || balance <= 0}
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
              <CardHeader title="Recent Transactions" />
              <CardContent>
                {recentTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            transaction.type === 'deposit' 
                              ? 'bg-green-100 text-green-600' 
                              : transaction.type === 'withdrawal'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {transaction.type === 'deposit' && <Plus className="w-4 h-4" />}
                            {transaction.type === 'withdrawal' && <ArrowDownToLine className="w-4 h-4" />}
                            {transaction.type === 'bet' && <TrendingUp className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 capitalize">
                              {transaction.type}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {transaction.description ? 
                                truncateText(transaction.description, 30) : 
                                new Date(transaction.created_at || 0).toLocaleDateString()
                              }
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${
                            transaction.type === 'deposit' 
                              ? 'text-green-600' 
                              : transaction.type === 'withdrawal' || transaction.type === 'bet'
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}>
                            {transaction.type === 'deposit' ? '+' : '-'}{formatUSDCompact(transaction.amount)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at || 0).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No transactions yet"
                    description="Your transaction history will appear here."
                    primaryAction={
                      <button
                        onClick={handleDeposit}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Add Funds
                      </button>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Page>
    </>
  );
};

export default WalletPage;
