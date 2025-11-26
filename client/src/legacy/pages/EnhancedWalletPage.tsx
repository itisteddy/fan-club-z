import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Minus, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Upload,
  Wallet,
  CreditCard,
  Smartphone,
  Eye,
  EyeOff,
  Zap,
  Activity,
  PieChart
} from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'wouter';
import { scrollToTop } from '../utils/scroll';
import toast from 'react-hot-toast';
import { openAuthGate } from '../auth/authGateAdapter';
import SignedOutGateCard from '../components/auth/SignedOutGateCard';
import { t } from '@/lib/lexicon';

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics'>('overview');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [showBalance, setShowBalance] = useState(true);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  
  const { 
    getBalance, 
    getTransactionHistory, 
    addFunds, 
    resetDemoBalance,
    isDemoMode 
  } = useWalletStore();
  const { user, isAuthenticated } = useAuthStore();
  const [, setLocation] = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ delay: 200 });
  }, []);

  const usdBalance = getBalance('USD') || 0;
  const transactions = getTransactionHistory({ currency: 'USD' }) || [];
  
  // Enhanced quick amounts with smart suggestions
  const quickAmounts = [25, 50, 100, 250];

  // Calculate portfolio stats
  const portfolioStats = {
    totalDeposited: transactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    totalWithdrawn: transactions
      .filter(t => t.type === 'withdraw' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0),
    totalPredictions: transactions
      .filter(t => t.type === 'bet_lock')
      .reduce((sum, t) => sum + t.amount, 0),
    totalWinnings: transactions
      .filter(t => t.type === 'bet_release')
      .reduce((sum, t) => sum + t.amount, 0)
  };

  const netProfit = portfolioStats.totalWinnings - portfolioStats.totalPredictions;
  const profitPercentage = portfolioStats.totalPredictions > 0 
    ? ((netProfit / portfolioStats.totalPredictions) * 100).toFixed(1)
    : '0';

  const handleAddFunds = async (amount: number) => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsAddingFunds(true);
    
    try {
      await addFunds(amount, 'USD', 'Demo funds added');
      toast.success(`Successfully added $${amount.toLocaleString()} to your wallet!`);
      setSelectedAmount(null);
      setCustomAmount('');
      setShowAddFundsModal(false);
    } catch (error) {
      toast.error('Failed to add funds. Please try again.');
    } finally {
      setIsAddingFunds(false);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    
    try {
      await resetDemoBalance();
      toast.success('Demo balance reset successfully!');
    } catch (error) {
      toast.error('Failed to reset demo balance');
    } finally {
      setIsResetting(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    const iconMap = {
      'deposit': Upload,
      'withdraw': Download,
      'bet_lock': TrendingDown,
      'bet_release': TrendingUp,
      'transfer_in': Plus,
      'transfer_out': Minus
    };
    return iconMap[type] || DollarSign;
  };

  const getTransactionColor = (type: string) => {
    const colorMap = {
      'deposit': 'text-teal-600 bg-teal-50',
      'withdraw': 'text-blue-600 bg-blue-50',
      'bet_lock': 'text-red-600 bg-red-50',
      'bet_release': 'text-teal-600 bg-teal-50',
      'transfer_in': 'text-teal-600 bg-teal-50',
      'transfer_out': 'text-orange-600 bg-orange-50'
    };
    return colorMap[type] || 'text-gray-600 bg-gray-50';
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      'completed': 'text-teal-700 bg-teal-100',
      'pending': 'text-yellow-700 bg-yellow-100',
      'failed': 'text-red-700 bg-red-100'
    };
    return colorMap[status] || 'text-gray-700 bg-gray-100';
  };

  // Enhanced Balance Card Component
  const BalanceCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden"
    >
      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-3xl p-6 text-white shadow-xl relative">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-teal-100 text-sm font-medium">Total Balance</p>
                {isDemoMode && (
                  <span className="inline-flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    Demo Mode
                  </span>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          {/* Balance Display */}
          <div className="mb-6">
            <motion.div
              key={showBalance ? 'visible' : 'hidden'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold mb-2"
            >
              {showBalance ? `$${usdBalance.toLocaleString()}` : '••••••'}
            </motion.div>
            
            {/* Profit/Loss Indicator */}
            <div className="flex items-center gap-2">
              {netProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-teal-200" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-200" />
              )}
              <span className="text-teal-100 text-sm font-medium">
                {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toLocaleString()} ({profitPercentage}%)
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddFundsModal(true)}
              className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-3 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span className="font-semibold">Add Funds</span>
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toast.info('Withdrawal coming soon!')}
              className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl py-3 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
              <span className="font-semibold">Withdraw</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600 font-medium">Total Deposited</span>
          </div>
          <p className="text-xl font-bold text-gray-900">${portfolioStats.totalDeposited.toLocaleString()}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-teal-600" />
            </div>
            <span className="text-sm text-gray-600 font-medium">Net Profit</span>
          </div>
          <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
            {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toLocaleString()}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );

  // Enhanced Tab Navigation
  const TabNavigation = () => (
    <div className="flex space-x-2 bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl mb-6">
      {[
        { id: 'overview', label: 'Overview', icon: Wallet },
        { id: 'transactions', label: 'Transactions', icon: Activity },
        { id: 'analytics', label: 'Analytics', icon: PieChart }
      ].map((tab, index) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 relative ${
              isActive
                ? 'bg-white text-gray-900 shadow-lg'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
            whileHover={{ scale: isActive ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : ''}`} />
            <span>{tab.label}</span>
            
            {/* Active indicator */}
            {isActive && (
              <motion.div
                layoutId="activeWalletTab"
                className="absolute inset-0 bg-white rounded-xl shadow-lg -z-10"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );

  // Enhanced Transaction Item Component
  const TransactionItem = ({ transaction, index }: { transaction: any, index: number }) => {
    const Icon = getTransactionIcon(transaction.type);
    const iconColorClass = getTransactionColor(transaction.type);
    const statusColorClass = getStatusColor(transaction.status);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold text-gray-900">
                {transaction.type === 'deposit' && 'Deposit'}
                {transaction.type === 'withdraw' && 'Withdrawal'}
                {transaction.type === 'bet_lock' && 'Prediction Placed'}
                {transaction.type === 'bet_release' && 'Prediction Won'}
                {transaction.type === 'transfer_in' && 'Transfer Received'}
                {transaction.type === 'transfer_out' && 'Transfer Sent'}
              </h4>
              <span className={`text-lg font-bold ${
                ['deposit', 'bet_release', 'transfer_in'].includes(transaction.type) 
                  ? 'text-teal-600' 
                  : 'text-gray-900'
              }`}>
                {['deposit', 'bet_release', 'transfer_in'].includes(transaction.type) ? '+' : '-'}
                ${Math.abs(transaction.amount).toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusColorClass}`}>
                {transaction.status}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Add Funds Modal Component
  const AddFundsModal = () => (
    <AnimatePresence>
      {showAddFundsModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddFundsModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Add Funds</h3>
              <p className="text-gray-600">Choose an amount to add to your wallet</p>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {quickAmounts.map((amount) => (
                <motion.button
                  key={amount}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedAmount(amount)}
                  className={`p-4 rounded-2xl border-2 transition-all duration-200 ${
                    selectedAmount === amount
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="text-xl font-bold">${amount}</div>
                  <div className="text-sm opacity-75">Quick add</div>
                </motion.button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-teal-500 text-lg font-medium"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddFundsModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const amount = selectedAmount || parseFloat(customAmount) || 0;
                  handleAddFunds(amount);
                }}
                disabled={isAddingFunds || (!selectedAmount && !customAmount)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAddingFunds ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Funds'
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Show auth gate if user is not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 pt-12 pb-6">
            {onNavigateBack && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onNavigateBack}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors mb-4"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Wallet</h1>
          </div>
        </div>
        <SignedOutGateCard
          title="Sign in to view your wallet"
          body="See your balance, deposits, and transactions."
          primaryLabel="Sign In"
          onPrimary={() => openAuthGate({ intent: 'view_wallet' })}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Enhanced Header */}
      <div className="h-11" />
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-11 z-40">
        <div className="px-6 pt-8 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4"
          >
            {onNavigateBack && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onNavigateBack}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </motion.button>
            )}
            
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Wallet
              </h1>
              <p className="text-gray-600">Manage your funds and track transactions</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Balance Card */}
        <BalanceCard />

        {/* Tab Navigation */}
        <div className="mt-8">
          <TabNavigation />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Recent Activity */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {transactions.slice(0, 3).map((transaction, index) => (
                    <TransactionItem key={transaction.id} transaction={transaction} index={index} />
                  ))}
                  
                  {transactions.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Activity className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h4>
                      <p className="text-gray-600 mb-6">Start by adding funds to your wallet</p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowAddFundsModal(true)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 mx-auto"
                      >
                        <Plus className="w-4 h-4" />
                        Add Funds
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo Mode Reset */}
              {isDemoMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Zap className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-800">Demo Mode Active</h4>
                        <p className="text-sm text-amber-700">Reset your balance anytime for testing</p>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleResetDemo}
                      disabled={isResetting}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {isResetting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          Reset
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'transactions' && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">All Transactions</h3>
                <span className="text-sm text-gray-600">{transactions.length} total</span>
              </div>
              
              {transactions.map((transaction, index) => (
                <TransactionItem key={transaction.id} transaction={transaction} index={index} />
              ))}
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h3 className="text-lg font-bold text-gray-900">Portfolio Analytics</h3>
              
              {/* Analytics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Upload className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Total Deposited</h4>
                      <p className="text-sm text-gray-600">All time</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${portfolioStats.totalDeposited.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Total {t('winnings')}</h4>
                      <p className="text-sm text-gray-600">From predictions</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-teal-600">${portfolioStats.totalWinnings.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Total Staked</h4>
                      <p className="text-sm text-gray-600">In predictions</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">${portfolioStats.totalPredictions.toLocaleString()}</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      netProfit >= 0 ? 'bg-teal-100' : 'bg-red-100'
                    }`}>
                      {netProfit >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-teal-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Net Profit</h4>
                      <p className="text-sm text-gray-600">{profitPercentage}% return</p>
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                    {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Funds Modal */}
      <AddFundsModal />
    </div>
  );
};

export default WalletPage;