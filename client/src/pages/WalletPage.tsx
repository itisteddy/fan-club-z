import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff, 
  Plus, 
  Minus, 
  History, 
  CreditCard, 
  Smartphone,
  TrendingUp,
  DollarSign,
  Copy,
  ExternalLink,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Send,
  Banknote,
  Shield
} from 'lucide-react';
import { useWalletStore, type Transaction } from '../stores/walletStore';

const WalletPage: React.FC = () => {
  const {
    balances,
    transactions,
    isDemoMode,
    isLoading,
    error,
    addFunds,
    withdraw,
    getBalance,
    getTransactionHistory,
    setDemoMode,
    initializeWallet,
    clearError
  } = useWalletStore();

  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDemoAlert, setShowDemoAlert] = useState(false);

  // Deposit form state
  const [depositForm, setDepositForm] = useState({
    amount: '',
    currency: 'NGN' as 'NGN' | 'USD' | 'USDT' | 'ETH',
    method: 'bank_transfer'
  });

  // Withdrawal form state
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    currency: 'NGN' as 'NGN' | 'USD' | 'USDT' | 'ETH',
    destination: ''
  });

  // Initialize wallet on mount
  useEffect(() => {
    initializeWallet();
    if (isDemoMode && !showDemoAlert) {
      setShowDemoAlert(true);
    }
  }, [initializeWallet, isDemoMode, showDemoAlert]);

  // Clear error when modals close
  useEffect(() => {
    if (!showDepositModal && !showWithdrawModal) {
      clearError();
    }
  }, [showDepositModal, showWithdrawModal, clearError]);

  // Calculate wallet data
  const primaryBalance = getBalance('NGN');
  const totalUSDValue = balances.reduce((total, balance) => {
    // Mock exchange rates for demo
    const rates = { NGN: 0.0012, USD: 1, USDT: 1, ETH: 2400 };
    return total + (balance.total * (rates[balance.currency] || 1));
  }, 0);

  const todayTransactions = transactions.filter(t => {
    const today = new Date();
    const transactionDate = new Date(t.date);
    return transactionDate.toDateString() === today.toDateString();
  });

  const todayChange = todayTransactions.reduce((sum, t) => {
    return sum + (t.type === 'deposit' || t.type === 'win' ? t.amount : 
                  t.type === 'withdraw' || t.type === 'prediction' || t.type === 'loss' ? -t.amount : 0);
  }, 0);

  const todayChangePercent = primaryBalance > 0 ? (todayChange / primaryBalance) * 100 : 0;

  const handleDeposit = async () => {
    try {
      const amount = parseFloat(depositForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (amount < 100) {
        throw new Error('Minimum deposit amount is ₦100');
      }

      if (amount > 1000000) {
        throw new Error('Maximum deposit amount is ₦1,000,000');
      }

      const methods = {
        bank_transfer: 'Bank Transfer',
        card: 'Credit/Debit Card',
        mobile_money: 'Mobile Money',
        crypto: 'Cryptocurrency'
      };

      await addFunds(amount, depositForm.currency, methods[depositForm.method as keyof typeof methods]);
      
      setShowDepositModal(false);
      setDepositForm({ amount: '', currency: 'NGN', method: 'bank_transfer' });
    } catch (error) {
      // Error is handled by the store - do nothing as store will show notification
      console.error('Deposit error:', error);
    }
  };

  const handleWithdraw = async () => {
    try {
      const amount = parseFloat(withdrawForm.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (amount < 100) {
        throw new Error('Minimum withdrawal amount is ₦100');
      }

      if (!withdrawForm.destination.trim()) {
        throw new Error('Please specify withdrawal destination');
      }

      if (withdrawForm.destination.trim().length < 5) {
        throw new Error('Please provide a valid destination');
      }

      await withdraw(amount, withdrawForm.currency, withdrawForm.destination.trim());
      
      setShowWithdrawModal(false);
      setWithdrawForm({ amount: '', currency: 'NGN', destination: '' });
    } catch (error) {
      // Error is handled by the store - do nothing as store will show notification
      console.error('Withdrawal error:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show temporary feedback
    const element = document.createElement('div');
    element.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10001;
    `;
    element.textContent = 'Copied!';
    document.body.appendChild(element);
    setTimeout(() => document.body.removeChild(element), 1000);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft size={16} className="text-green-600" />;
      case 'withdraw':
        return <ArrowUpRight size={16} className="text-red-600" />;
      case 'win':
        return <TrendingUp size={16} className="text-green-600" />;
      case 'loss':
      case 'prediction':
        return <TrendingUp size={16} className="text-red-600 rotate-180" />;
      case 'transfer_in':
        return <Send size={16} className="text-blue-600 rotate-180" />;
      case 'transfer_out':
        return <Send size={16} className="text-orange-600" />;
      default:
        return <DollarSign size={16} className="text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win':
      case 'transfer_in':
        return 'text-green-600';
      case 'withdraw':
      case 'loss':
      case 'prediction':
      case 'transfer_out':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-600',
      pending: 'bg-yellow-100 text-yellow-600',
      failed: 'bg-red-100 text-red-600'
    };
    
    const icons = {
      completed: <CheckCircle size={12} />,
      pending: <Clock size={12} />,
      failed: <AlertCircle size={12} />
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status}
      </span>
    );
  };

  return (
    <div className="main-page-wrapper bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Demo Mode Alert */}
      <AnimatePresence initial={false}>
        {showDemoAlert && isDemoMode && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white p-4"
          >
            <div className="flex items-center justify-between max-w-lg mx-auto">
              <div className="flex items-center gap-3">
                <Shield size={20} />
                <div>
                  <div className="font-semibold">Demo Mode Active</div>
                  <div className="text-sm opacity-90">All transactions are simulated</div>
                </div>
              </div>
              <button
                onClick={() => setShowDemoAlert(false)}
                className="text-white/80 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative overflow-hidden" style={{ marginTop: showDemoAlert && isDemoMode ? '80px' : '0' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 via-green-700 to-teal-600" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-transparent to-purple-600/10" />
        
        {/* Animated background elements */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="relative z-10 px-6 pt-14 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-white">My Wallet 💳</h1>
              {isDemoMode && (
                <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-white text-sm font-semibold">DEMO</span>
                </div>
              )}
            </div>
            <p className="text-green-100 text-lg">Manage your funds and transactions</p>
          </motion.div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/15 backdrop-blur-xl rounded-3xl border border-white/20 p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Wallet size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm">Total Balance</p>
                  <div className="flex items-center gap-2">
                    {showBalance ? (
                      <h2 className="text-3xl font-bold text-white">
                        ₦{primaryBalance.toLocaleString()}
                      </h2>
                    ) : (
                      <h2 className="text-3xl font-bold text-white">₦••••••</h2>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                    </motion.button>
                  </div>
                </div>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-white/20 rounded-xl text-white hover:bg-white/30 transition-all duration-200"
                onClick={() => window.location.reload()}
              >
                <RefreshCcw size={20} />
              </motion.button>
            </div>

            {/* Today's Change */}
            {todayChange !== 0 && (
              <div className="flex items-center gap-2 mb-6">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  todayChangePercent > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  <TrendingUp size={14} className={todayChangePercent > 0 ? 'text-green-400' : 'text-red-400 rotate-180'} />
                  <span className={`text-sm font-semibold ${
                    todayChangePercent > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {todayChangePercent > 0 ? '+' : ''}₦{todayChange.toLocaleString()} ({todayChangePercent.toFixed(1)}%)
                  </span>
                </div>
                <span className="text-white/60 text-sm">today</span>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDepositModal(true)}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 p-4 bg-white/20 backdrop-blur-sm rounded-2xl text-white font-semibold hover:bg-white/30 transition-all duration-200 disabled:opacity-60"
              >
                <Plus size={20} />
                <span>Deposit</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowWithdrawModal(true)}
                disabled={isLoading || primaryBalance <= 0}
                className="flex items-center justify-center gap-2 p-4 bg-white/20 backdrop-blur-sm rounded-2xl text-white font-semibold hover:bg-white/30 transition-all duration-200 disabled:opacity-60"
              >
                <Minus size={20} />
                <span>Withdraw</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Multi-Currency Balances */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 gap-4"
          >
            {balances.filter(b => b.total > 0 || b.currency === 'NGN').map((balance) => (
              <div key={balance.currency} className="bg-white/15 backdrop-blur-xl rounded-2xl border border-white/20 p-4">
                <p className="text-white/80 text-sm mb-1">{balance.currency}</p>
                <p className="text-white text-xl font-bold">
                  {balance.currency === 'NGN' ? '₦' : balance.currency === 'USD' ? '$' : ''}
                  {balance.total.toLocaleString()}
                </p>
                {balance.reserved > 0 && (
                  <p className="text-white/60 text-xs">
                    {balance.reserved.toLocaleString()} reserved
                  </p>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="px-6 -mt-4 mb-6 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-2"
        >
          <div className="flex">
            {[
              { id: 'overview', label: 'Overview', icon: Wallet },
              { id: 'transactions', label: 'Transactions', icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/25'
                      : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                  }`}
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Tab Content */}
      <div className="px-6 pb-8">
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Account Summary */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Account Summary</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <p className="text-sm text-green-600 mb-1">Available</p>
                    <p className="text-2xl font-bold text-green-700">₦{getBalance('NGN').toLocaleString()}</p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-600 mb-1">Reserved</p>
                    <p className="text-2xl font-bold text-blue-700">
                      ₦{(balances.find(b => b.currency === 'NGN')?.reserved || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Transaction Stats</h3>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
                    <div className="text-sm text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {transactions.filter(t => t.type === 'deposit' || t.type === 'win').length}
                    </div>
                    <div className="text-sm text-gray-600">Credits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {transactions.filter(t => t.type === 'withdraw' || t.type === 'prediction').length}
                    </div>
                    <div className="text-sm text-gray-600">Debits</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
                
                <div className="space-y-4">
                  {getTransactionHistory({ limit: 5 }).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500">
                              {new Date(transaction.date).toLocaleDateString()} at {new Date(transaction.date).toLocaleTimeString()}
                            </p>
                            {transaction.reference && (
                              <>
                                <span className="text-gray-300">•</span>
                                <button
                                  onClick={() => copyToClipboard(transaction.reference!)}
                                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                                >
                                  {transaction.reference}
                                  <Copy size={10} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                          {(transaction.type === 'deposit' || transaction.type === 'win' || transaction.type === 'transfer_in') ? '+' : '-'}
                          ₦{transaction.amount.toLocaleString()}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {transactions.length > 5 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('transactions')}
                    className="w-full mt-4 py-3 text-green-600 font-semibold hover:text-green-700 transition-colors"
                  >
                    View All Transactions
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">All Transactions</h3>
                  <span className="text-sm text-gray-500">{transactions.length} transactions</span>
                </div>
                
                <div className="space-y-4">
                  {getTransactionHistory().map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{new Date(transaction.date).toLocaleDateString()} at {new Date(transaction.date).toLocaleTimeString()}</span>
                            {transaction.reference && (
                              <>
                                <span>•</span>
                                <button
                                  onClick={() => copyToClipboard(transaction.reference!)}
                                  className="flex items-center gap-1 hover:text-gray-700"
                                >
                                  <span>{transaction.reference}</span>
                                  <Copy size={12} />
                                </button>
                              </>
                            )}
                          </div>
                          {transaction.fee && (
                            <p className="text-xs text-gray-400">Fee: ₦{transaction.fee.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                          {(transaction.type === 'deposit' || transaction.type === 'win' || transaction.type === 'transfer_in') ? '+' : '-'}
                          ₦{transaction.amount.toLocaleString()}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {transactions.length === 0 && (
                  <div className="text-center py-12">
                    <Wallet size={48} className="text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-600 mb-2">No transactions yet</h4>
                    <p className="text-gray-500">Your transaction history will appear here</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence initial={false}>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowDepositModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Deposit Funds</h3>
                {isDemoMode && (
                  <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-semibold">
                    DEMO
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                    <input
                      type="number"
                      value={depositForm.amount}
                      onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200 text-lg font-semibold"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[1000, 5000, 10000, 25000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setDepositForm({ ...depositForm, amount: amount.toString() })}
                        className="flex-1 py-2 px-3 text-sm font-semibold text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        ₦{amount.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
                  <div className="space-y-3">
                    {[
                      { id: 'bank_transfer', label: 'Bank Transfer', icon: Banknote, desc: 'Instant via bank transfer' },
                      { id: 'card', label: 'Credit/Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Verve' },
                      { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone, desc: 'MTN, Airtel, 9mobile' }
                    ].map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => setDepositForm({ ...depositForm, method: method.id })}
                          className={`w-full p-4 border-2 rounded-2xl text-left transition-all duration-200 ${
                            depositForm.method === method.id
                              ? 'border-green-300 bg-green-50'
                              : 'border-gray-200 hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              depositForm.method === method.id ? 'bg-green-100' : 'bg-gray-100'
                            }`}>
                              <Icon size={24} className={depositForm.method === method.id ? 'text-green-600' : 'text-gray-600'} />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{method.label}</h4>
                              <p className="text-sm text-gray-600">{method.desc}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDepositModal(false)}
                  disabled={isLoading}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-60"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeposit}
                  disabled={isLoading || !depositForm.amount || parseFloat(depositForm.amount) <= 0}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Deposit ₦{depositForm.amount ? parseFloat(depositForm.amount).toLocaleString() : '0'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence initial={false}>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Withdraw Funds</h3>
                {isDemoMode && (
                  <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-xs font-semibold">
                    DEMO
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                  <AlertCircle size={16} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Available Balance
                  </label>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-2xl font-bold text-gray-900">₦{getBalance('NGN').toLocaleString()}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Withdrawal Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                    <input
                      type="number"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                      placeholder="0.00"
                      max={getBalance('NGN')}
                      className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200 text-lg font-semibold"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[25, 50, 75, 100].map((percentage) => {
                      const amount = Math.floor((getBalance('NGN') * percentage) / 100);
                      return (
                        <button
                          key={percentage}
                          onClick={() => setWithdrawForm({ ...withdrawForm, amount: amount.toString() })}
                          className="flex-1 py-2 px-3 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          disabled={amount <= 0}
                        >
                          {percentage}%
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={withdrawForm.destination}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, destination: e.target.value })}
                    placeholder="Bank account, wallet address, etc."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-green-500 focus:outline-none transition-all duration-200"
                  />
                </div>

                {isDemoMode && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <Shield className="inline w-4 h-4 mr-1" />
                      Demo mode: Withdrawal will be processed instantly for testing
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowWithdrawModal(false)}
                  disabled={isLoading}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 disabled:opacity-60"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleWithdraw}
                  disabled={isLoading || !withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0 || !withdrawForm.destination.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Minus size={16} />
                      Withdraw ₦{withdrawForm.amount ? parseFloat(withdrawForm.amount).toLocaleString() : '0'}
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletPage;
