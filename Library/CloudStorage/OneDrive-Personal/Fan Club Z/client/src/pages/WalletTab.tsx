import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  TrendingUp,
  Filter,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PaymentModal } from '../components/payment/PaymentModal';
import { useAuthStore } from '../store/authStore';
import { useWalletStore } from '../store/walletStore';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'transfer';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  createdAt: string;
  reference?: string;
}

export const WalletTab: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    balance, 
    updateBalance, 
    transactions, 
    isLoading, 
    error,
    refreshBalance,
    fetchTransactions,
    addDepositTransaction,
    addWithdrawTransaction
  } = useWalletStore();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'deposits' | 'withdrawals' | 'bets'>('all');
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Quick deposit amounts
  const quickAmounts = [10, 25, 50, 100, 250, 500];

  // Load wallet data on mount - FIXED: Only run once per user
  useEffect(() => {
    if (user && !dataLoaded) {
      console.log('[WALLET] Loading wallet data for user:', user.id);
      
      // Load data and mark as loaded
      Promise.all([
        refreshBalance(user.id).catch(console.error),
        fetchTransactions(user.id).catch(console.error)
      ]).finally(() => {
        setDataLoaded(true);
      });
    }
  }, [user?.id]); // FIXED: Only depend on user.id, not the functions

  // Reset loaded state when user changes
  useEffect(() => {
    if (user?.id) {
      setDataLoaded(false);
    }
  }, [user?.id]);

  const refreshTransactions = async () => {
    if (user && !isLoading) {
      try {
        await fetchTransactions(user.id);
      } catch (error) {
        console.warn('[WALLET] Failed to refresh transactions:', error);
      }
    }
  };

  const handleDepositSuccess = (amount: number) => {
    console.log('[WALLET] Deposit successful, amount:', amount);
    
    // Create transaction record first, then it will also update balance
    addDepositTransaction(amount, user?.id);
    
    // Refresh transactions to ensure consistency
    if (user) {
      refreshTransactions();
    }
    
    console.log('[WALLET] Deposit transaction added successfully');
  };

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0 || withdrawAmount > balance) {
      return;
    }

    try {
      console.log('[WALLET] Withdrawal initiated, amount:', withdrawAmount);
      
      // Get token with better error handling
      const token = localStorage.getItem('auth_token') || localStorage.getItem('accessToken');
      
      if (!token) {
        console.error('[WALLET] No authentication token found');
        // Still process locally for demo mode
        addWithdrawTransaction(withdrawAmount, user?.id);
        setShowWithdrawModal(false);
        setWithdrawAmount(0);
        return;
      }

      // Make the API call with proper error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch('/api/payment/withdraw', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: withdrawAmount,
            currency: 'USD',
            destination: 'bank_account'
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          
          if (data.success) {
            console.log('[WALLET] Backend withdrawal successful:', data);
            
            // Update local state to match backend
            addWithdrawTransaction(withdrawAmount, user?.id);
            
            setShowWithdrawModal(false);
            setWithdrawAmount(0);
            
            // Refresh data to ensure consistency
            if (user) {
              await Promise.all([
                refreshTransactions(),
                refreshBalance(user.id)
              ]).catch(console.warn);
            }
            
            console.log('[WALLET] Withdrawal completed successfully');
            return;
          } else {
            throw new Error(data.error || 'Withdrawal failed');
          }
        } else {
          // Handle HTTP errors
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // Handle specific error types
        if (fetchError.name === 'AbortError') {
          console.warn('[WALLET] Withdrawal request timed out, processing locally');
        } else if (fetchError.message?.includes('Failed to fetch')) {
          console.warn('[WALLET] Network error, processing locally');
        } else {
          console.error('[WALLET] API withdrawal failed:', fetchError.message);
        }
        
        // For demo mode or when backend is unavailable, process locally
        console.log('[WALLET] Processing withdrawal locally (demo/fallback mode)');
        addWithdrawTransaction(withdrawAmount, user?.id);
        
        setShowWithdrawModal(false);
        setWithdrawAmount(0);
        
        // Refresh local data
        if (user) {
          await refreshTransactions().catch(console.warn);
        }
        
        console.log('[WALLET] Withdrawal processed locally');
      }
    } catch (error) {
      console.error('[WALLET] Unexpected withdrawal error:', error);
      
      // Last resort: still try to process locally
      addWithdrawTransaction(withdrawAmount, user?.id);
      setShowWithdrawModal(false);
      setWithdrawAmount(0);
      
      if (user) {
        await refreshTransactions().catch(console.warn);
      }
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'withdraw':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      case 'bet':
      case 'bet_lock':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'win':
      case 'bet_release':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win':
      case 'bet_release':
        return 'text-green-600';
      case 'withdraw':
        return 'text-red-600';
      case 'bet':
      case 'bet_lock':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'deposits') return tx.type === 'deposit' || tx.type === 'bet_release';
    if (selectedFilter === 'withdrawals') return tx.type === 'withdraw';
    if (selectedFilter === 'bets') return tx.type === 'bet' || tx.type === 'bet_lock' || tx.type === 'win';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-2xl font-bold">Wallet</h1>
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <section className="px-4 py-6">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white" data-testid="wallet-balance-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white/90">Available Balance</h2>
            <Wallet className="w-6 h-6 text-white/80" />
          </div>
          <div className="text-3xl font-bold mb-6" data-testid="wallet-balance-amount">
            ${balance.toFixed(2)}
          </div>
          
          {/* Quick Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex-1 h-11 bg-white/20 backdrop-blur-md rounded-lg 
                         font-medium text-white flex items-center justify-center
                         active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Funds
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={balance <= 0}
              className="flex-1 h-11 bg-white/20 backdrop-blur-md rounded-lg 
                         font-medium text-white flex items-center justify-center
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-transform"
            >
              <Minus className="w-4 h-4 mr-2" />
              Withdraw
            </button>
          </div>
        </div>
      </section>

      {/* Quick Deposit */}
      <section className="px-4 mb-6">
        <h3 className="text-lg font-semibold mb-4">Quick Deposit</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => {
                setDepositAmount(amount);
                setShowPaymentModal(true);
              }}
              className="h-11 sm:h-12 bg-white rounded-xl border border-gray-200 
                         font-medium text-sm sm:text-base transition-all duration-200
                         hover:border-blue-300 hover:bg-blue-50 active:scale-95
                         touch-manipulation min-h-[44px]"
            >
              ${amount}
            </button>
          ))}
        </div>
      </section>

      {/* Transaction History */}
      <section className="px-4 pb-24"> {/* Added bottom padding for navigation */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Transaction History</h3>
          <button 
            className="p-2 bg-white rounded-full border border-gray-200"
            onClick={() => {
              // Manual refresh for debugging
              if (user) {
                console.log('[WALLET] Manual refresh transactions');
                fetchTransactions(user.id);
              }
            }}
          >
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white border-b border-gray-100 mb-4 rounded-t-xl">
          <div className="px-4 py-3">
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto py-2 -mx-2 px-2 scrollbar-hide scroll-smooth-x">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'deposits', label: 'Deposits' },
                  { id: 'withdrawals', label: 'Withdrawals' },
                  { id: 'bets', label: 'Bets' },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setSelectedFilter(filter.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 min-w-fit touch-manipulation",
                      "min-h-[36px] active:scale-95",
                      selectedFilter === filter.id
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                    )}
                  >
                    <span className="text-sm leading-none">{filter.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List with Proper Scrolling */}
        <div 
          className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100"
          style={{ maxHeight: 'calc(100vh - 480px)', minHeight: '300px' }} 
          data-testid="transaction-list"
        >
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center" data-testid="transaction-empty">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold mb-2">No transactions yet</h4>
              <p className="text-gray-500 mb-4">
                Start by adding funds to your wallet
              </p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="h-11 px-6 bg-blue-500 text-white font-medium rounded-lg"
              >
                Add Funds
              </button>
            </div>
          ) : (
            <div 
              className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" 
              style={{ maxHeight: 'inherit' }}
              data-testid="transaction-items"
            >
              {filteredTransactions.map((transaction, index) => (
                <div 
                  key={transaction.id} 
                  className={cn(
                    "flex items-center p-4 hover:bg-gray-50 transition-colors",
                    index !== filteredTransactions.length - 1 && "border-b border-gray-100"
                  )}
                  data-testid="transaction-item"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{transaction.description}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {transaction.reference && (
                        <>
                          <span className="text-gray-300">•</span>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-24">
                            {transaction.reference}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                      {(['deposit', 'bet_release', 'win'].includes(transaction.type)) ? '+' : '-'}
                      ${Math.abs(transaction.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={depositAmount}
        onSuccess={handleDepositSuccess}
      />

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Demo Mode Banner */}
          <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium z-50">
            Demo Mode: No real money is involved. All funds are virtual.
          </div>
          
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl 
                          shadow-2xl transform transition-all duration-300 ease-out
                          max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Withdraw Funds</h2>
                  <p className="text-sm text-gray-500">Demo withdrawal (no real money)</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center
                           active:scale-95 transition-transform"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Amount Display & Presets */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Amount to withdraw</span>
                    <span className="text-xl font-bold">${withdrawAmount.toFixed(2)}</span>
                  </div>
                  
                  {/* Quick withdraw amounts - filtered by available balance */}
                  <div className="flex gap-2 flex-wrap mb-4">
                    {[25, 50, 100, 250, 500].filter(amount => amount <= balance).map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        className={`px-4 py-2 rounded-lg font-medium border transition-all ${
                          withdrawAmount === preset 
                            ? 'bg-red-500 text-white border-red-500' 
                            : 'bg-white text-red-500 border-red-200 hover:bg-red-50'
                        }`}
                        onClick={() => setWithdrawAmount(preset)}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom amount input */}
                  <input
                    type="number"
                    min={5}
                    max={balance}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    className="w-full h-11 px-4 bg-gray-100 rounded-lg text-center font-semibold 
                               border border-gray-200 focus:border-red-500 focus:outline-none
                               transition-colors"
                    placeholder="Enter custom amount"
                  />
                  
                  <div className="mt-3 flex justify-between text-xs text-gray-500">
                    <span>Available: ${balance.toFixed(2)}</span>
                    <span>Min: $5.00</span>
                  </div>
                </div>

                {/* Withdraw Button */}
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawAmount <= 0 || withdrawAmount > balance || withdrawAmount < 5}
                  className="w-full h-12 bg-red-500 text-white font-semibold 
                             rounded-lg disabled:opacity-50 
                             disabled:cursor-not-allowed active:scale-95 
                             transition-all duration-200"
                >
                  {withdrawAmount <= 0 
                    ? 'Enter amount' 
                    : withdrawAmount < 5 
                      ? 'Minimum $5.00' 
                      : withdrawAmount > balance 
                        ? 'Insufficient funds' 
                        : `Withdraw ${withdrawAmount.toFixed(2)}`
                  }
                </button>
                
                {/* Demo notice */}
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    No real money is involved. This is a demo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTab;
