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
  Upload
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
  const [isResetting, setIsResetting] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  
  const {
    getBalance,
    getTransactionHistory,
    addFunds, 
    resetDemoBalance,
    isDemoMode 
  } = useWalletStore();
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  // Scroll to top when component mounts
  useEffect(() => {
    scrollToTop({ delay: 200 });
  }, []);

  const usdBalance = getBalance('USD') || 0;
  const transactions = getTransactionHistory({ currency: 'USD' }) || [];
  
  // Demo mode quick amounts
  const quickAmounts = [10, 25, 50, 100];

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
      toast.error('Failed to reset demo balance. Please try again.');
    } finally {
      setIsResetting(false);
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
        return <Download size={16} className="text-green-500" />;
      case 'withdrawal':
        return <Upload size={16} className="text-red-500" />;
      case 'prediction':
        return <TrendingUp size={16} className="text-blue-500" />;
      case 'win':
        return <CheckCircle size={16} className="text-green-500" />;
      default:
        return <DollarSign size={16} className="text-gray-500" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win':
        return 'text-green-600';
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
        {/* Status bar spacer */}
        <div className="h-11" />
        
        <div className="px-4 py-4">
          <div className="flex items-center justify-between" data-tour-id="wallet-balance">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-700" />
            </button>
            
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Wallet</h1>
              {isDemoMode && (
                <p className="text-xs text-gray-500 mt-1">Demo Mode</p>
              )}
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Demo Mode Banner */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-white" />
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Demo Funds</h3>
              <p className="text-blue-100 text-xs">
                This is a demo wallet. All transactions are simulated.
              </p>
            </div>
          </div>
          </motion.div>
      )}

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mt-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white"
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
                </div>
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <DollarSign size={24} className="text-white" />
          </div>
              </div>
              
        {/* Quick Actions */}
        <div className="flex gap-2" data-tour-id="wallet-actions">
          <button
            onClick={() => setSelectedAmount(25)}
            className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg py-2 px-3 text-sm font-medium transition-all"
          >
            Add Funds
          </button>
          {isDemoMode && (
            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg py-2 px-3 text-sm font-medium transition-all disabled:opacity-50"
            >
              {isResetting ? (
                <div className="flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Resetting...
                </div>
              ) : (
                'Reset Demo'
              )}
            </button>
          )}
            </div>
          </motion.div>

      {/* Tab Navigation */}
      <div className="mx-4 mt-6">
        <div className="bg-white rounded-xl p-1 flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-green-500 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transactions'
                ? 'bg-green-500 text-white'
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
                    <TrendingUp size={16} className="text-green-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Won</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(transactions.filter(t => t.type === 'win').reduce((sum, t) => sum + t.amount, 0))}
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown size={16} className="text-red-500" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Total Lost</span>
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
        {selectedAmount !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedAmount(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Demo Funds</h3>
              
              {/* Quick amounts */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                    onClick={() => setCustomAmount(amount.toString())}
                    className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                      customAmount === amount.toString()
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    ${amount}
                      </button>
                    ))}
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
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAmount(null)}
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
                      : 'bg-green-600 text-white hover:bg-green-700'
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
    </div>
  );
};

export default WalletPage;
