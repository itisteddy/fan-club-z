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
  Info,
  CreditCard,
  Banknote,
  HelpCircle
} from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { useLocation } from 'wouter';
import { scrollToTop } from '../utils/scroll';
import toast from 'react-hot-toast';

interface WalletPageProps {
  onNavigateBack?: () => void;
}

const WalletPage: React.FC<WalletPageProps> = ({ onNavigateBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  
  const {
    getBalance,
    getTransactionHistory,
    addFunds,
    withdraw,
    initializeWallet 
  } = useWalletStore();
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  // Initialize wallet and scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ delay: 200 });
    if (user?.id) {
      initializeWallet();
    }
  }, [user?.id, initializeWallet]);

  const usdBalance = getBalance('USD') || 0;
  const transactions = getTransactionHistory({ currency: 'USD' }) || [];
  
  // Quick amounts for add funds
  const quickAmounts = [10, 25, 50, 100];
  const withdrawAmounts = [25, 50, 100, 200];

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

  const handleWithdrawFunds = async (amount: number) => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > usdBalance) {
      toast.error('Insufficient funds for withdrawal');
      return;
    }

    setIsWithdrawing(true);
    
    try {
      await withdraw(amount, 'USD', 'Bank Account');
      toast.success(`Withdrawal request submitted for $${amount.toLocaleString()}`);
      setWithdrawAmount('');
      setShowWithdrawModal(false);
    } catch (error) {
      toast.error('Failed to process withdrawal. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleResetDemo = async () => {
    // Demo reset functionality removed - using real wallet data
    toast.success('Wallet data is now connected to your real account');
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
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Download size={16} className="text-emerald-500" />;
      case 'withdrawal':
        return <Upload size={16} className="text-red-500" />;
      case 'prediction':
        return <TrendingUp size={16} className="text-blue-500" />;
      case 'win':
        return <CheckCircle size={16} className="text-emerald-500" />;
      default:
        return <DollarSign size={16} className="text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win':
        return 'text-emerald-600';
      case 'withdrawal':
      case 'prediction':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 wallet-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        {/* Status bar spacer - reduced height */}
        <div className="h-11" />
        
        <div className="px-4 py-1">
          <div className="flex items-center justify-between" data-tour-id="wallet-balance">
            <button
              onClick={handleBackClick}
              className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={16} className="text-gray-700" />
            </button>
            
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Wallet</h1>
            </div>
            
            <div className="w-8" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-4 mt-4 bg-gradient-to-br from-purple-500 to-emerald-600 rounded-2xl p-6 text-white"
        data-tour-id="wallet-balance-card"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-medium text-green-100 uppercase tracking-wide">
              Available Balance
            </h2>
            <div className="text-3xl font-bold mt-1">
              {formatCurrency(usdBalance)}
            </div>
            <p className="text-xs text-green-100 mt-1 opacity-90">
              Ready to use for predictions
            </p>
          </div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <DollarSign size={24} className="text-white" />
          </div>
        </div>
              
        {/* Quick Actions */}
        <div className="flex gap-2" data-tour-id="wallet-actions">
          <button
            onClick={() => setShowAddFundsModal(true)}
            className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg py-2 px-3 text-sm font-medium transition-all flex items-center justify-center gap-2"
            title="Add funds to your wallet for making predictions"
          >
            <Plus size={16} />
            Add Funds
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={usdBalance <= 0}
            className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              usdBalance > 0 
                ? 'bg-white bg-opacity-20 hover:bg-opacity-30' 
                : 'bg-white bg-opacity-10 cursor-not-allowed'
            }`}
            title={usdBalance > 0 ? "Withdraw funds to your bank account" : "No funds available for withdrawal"}
          >
            <Minus size={16} />
            Withdraw
          </button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="mx-4 mt-6">
        <div className="bg-white rounded-xl p-1 flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-emerald-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Transactions
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-4 mt-4">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Won</span>
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(transactions.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0))}
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={16} className="text-red-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Lost</span>
                    <HelpCircle size={12} className="text-gray-400" />
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(Math.abs(transactions.filter(t => t.type === 'prediction').reduce((sum, t) => sum + t.amount, 0)))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                </div>
                <div className="p-4">
                  {transactions.slice(0, 3).length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 3).map((transaction, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(transaction.date)}
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Clock size={24} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">No transactions yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Transactions List */}
              <div className="bg-white rounded-xl border border-gray-100">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">All Transactions</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {transactions.length > 0 ? (
                    transactions.map((transaction, index) => (
                      <div key={index} className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.description}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(transaction.date)}
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Clock size={32} className="text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No transactions yet</p>
                      <p className="text-gray-400 text-sm mt-1">Start making predictions to see your activity</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Funds Modal */}
      <AnimatePresence>
        {showAddFundsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddFundsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={20} className="text-emerald-600" />
                <h3 className="text-lg font-bold text-gray-900">Add Funds</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Add funds to your wallet to start making predictions. These are demo funds for testing purposes.
              </p>
              
              {/* Quick amounts */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Amounts
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {quickAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setCustomAmount(amount.toString())}
                      className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        customAmount === amount.toString()
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    min="1"
                    max="10000"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter any amount between $1 and $10,000
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddFundsModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAddFunds(parseFloat(customAmount) || 0)}
                  disabled={!customAmount || parseFloat(customAmount) <= 0 || isAddingFunds}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    !customAmount || parseFloat(customAmount) <= 0 || isAddingFunds
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isAddingFunds ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Adding...
                    </div>
                  ) : (
                    'Add Funds'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Withdraw Funds Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-4">
                <Banknote size={20} className="text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">Withdraw Funds</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Withdraw funds from your wallet to your bank account. Processing may take 1-3 business days.
              </p>
              
              {/* Available balance */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="text-sm text-gray-600">Available for withdrawal</div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(usdBalance)}</div>
              </div>
              
              {/* Quick amounts */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Amounts
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {withdrawAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setWithdrawAmount(amount.toString())}
                      disabled={amount > usdBalance}
                      className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        withdrawAmount === amount.toString()
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : amount > usdBalance
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    min="1"
                    max={usdBalance}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum withdrawal: {formatCurrency(usdBalance)}
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleWithdrawFunds(parseFloat(withdrawAmount) || 0)}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > usdBalance || isWithdrawing}
                  className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                    !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > usdBalance || isWithdrawing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {isWithdrawing ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin" />
                      Processing...
                    </div>
                  ) : (
                    'Withdraw'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletPage;
