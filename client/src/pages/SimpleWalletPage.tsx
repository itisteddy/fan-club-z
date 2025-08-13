import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle } from 'lucide-react';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';

const SimpleWalletPage: React.FC = () => {
  const { balance, transactions, loading } = useWalletStore();
  const { user } = useAuthStore();

  const mockTransactions = [
    {
      id: '1',
      type: 'deposit' as const,
      amount: 500,
      status: 'completed' as const,
      description: 'Added funds via card',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'bet_lock' as const,
      amount: -150,
      status: 'completed' as const,
      description: 'Prediction: Bitcoin $100k',
      timestamp: '4 hours ago'
    },
    {
      id: '3',
      type: 'bet_release' as const,
      amount: 275,
      status: 'completed' as const,
      description: 'Won: Arsenal Top 4',
      timestamp: '1 day ago'
    },
    {
      id: '4',
      type: 'withdraw' as const,
      amount: -200,
      status: 'pending' as const,
      description: 'Withdrawal to bank',
      timestamp: '2 days ago'
    }
  ];

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'withdraw':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'bet_lock':
        return <ArrowUpRight className="w-4 h-4 text-orange-500" />;
      case 'bet_release':
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      default:
        return <Wallet className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTransactionColor = (amount: number, status: string) => {
    if (status === 'pending') return 'text-yellow-600';
    return amount > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 pt-12 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet</h1>
          <p className="text-gray-600">Manage your funds and transactions</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 mb-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-green-100 text-sm font-medium mb-1">Available Balance</div>
              <div className="text-3xl font-bold">
                ${balance?.toLocaleString() || '1,247.50'}
              </div>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl py-3 px-4 font-semibold text-white flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Deposit
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-white/20 backdrop-blur-sm rounded-xl py-3 px-4 font-semibold text-white flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </motion.button>
          </div>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Transactions</h2>
          
          <div className="space-y-4">
            {mockTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  {getTransactionIcon(transaction.type, transaction.status)}
                </div>
                
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">
                    {transaction.description}
                  </div>
                  <div className="text-sm text-gray-600">
                    {transaction.timestamp}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`font-bold ${getTransactionColor(transaction.amount, transaction.status)}`}>
                    {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {transaction.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SimpleWalletPage;
