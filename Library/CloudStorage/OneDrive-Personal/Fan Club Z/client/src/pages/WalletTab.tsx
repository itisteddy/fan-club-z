import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Minus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Wallet, 
  TrendingUp,
  Calendar,
  Filter,
  Search,
  X
} from 'lucide-react'
import { PaymentModal } from '../components/payment/PaymentModal'
import { useAuthStore } from '../store/authStore'
import { useWalletStore } from '../store/walletStore'

interface Transaction {
  id: string
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'transfer'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  description: string
  createdAt: string
  reference?: string
}

export const WalletTab: React.FC = () => {
  const { user } = useAuthStore()
  const { balance, updateBalance } = useWalletStore()
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState(50)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'deposits' | 'withdrawals' | 'bets'>('all')

  // Quick deposit amounts
  const quickAmounts = [10, 25, 50, 100, 250, 500]

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/payments/transactions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        setTransactions(result.data.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDepositSuccess = (amount: number) => {
    updateBalance(balance + amount)
    fetchTransactions()
  }

  const handleWithdraw = async () => {
    if (withdrawAmount <= 0 || withdrawAmount > balance) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          amount: withdrawAmount,
          destination: 'bank_account', // In real app, user would select destination
        }),
      })

      const result = await response.json()

      if (result.success) {
        updateBalance(balance - withdrawAmount)
        setShowWithdrawModal(false)
        setWithdrawAmount(0)
        fetchTransactions()
      } else {
        alert(result.error || 'Withdrawal failed')
      }
    } catch (error) {
      console.error('Withdrawal failed:', error)
      alert('Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />
      case 'withdraw':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />
      case 'bet':
        return <TrendingUp className="w-5 h-5 text-blue-500" />
      case 'win':
        return <TrendingUp className="w-5 h-5 text-green-500" />
      default:
        return <Wallet className="w-5 h-5 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'win':
        return 'text-green-600'
      case 'withdraw':
        return 'text-red-600'
      case 'bet':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  const filteredTransactions = transactions.filter(tx => {
    if (selectedFilter === 'all') return true
    if (selectedFilter === 'deposits') return tx.type === 'deposit'
    if (selectedFilter === 'withdrawals') return tx.type === 'withdraw'
    if (selectedFilter === 'bets') return tx.type === 'bet' || tx.type === 'win'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Mode Banner */}
      <div className="w-full bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium z-50">
        Demo Mode: No real money is involved. All funds are virtual.
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">Wallet</h1>
          </div>
        </div>
      </header>

      {/* Balance Card */}
      <section className="px-4 py-6">
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-body text-white/90">Available Balance</h2>
            <Wallet className="w-6 h-6 text-white/80" />
          </div>
          <div className="text-3xl font-bold mb-6">
            ${balance.toFixed(2)}
          </div>
          
          {/* Quick Actions */}
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex-1 h-11 bg-white/20 backdrop-blur-md rounded-[10px] 
                         font-medium text-white flex items-center justify-center
                         active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Funds
            </button>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={balance <= 0}
              className="flex-1 h-11 bg-white/20 backdrop-blur-md rounded-[10px] 
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
        <h3 className="text-title-3 font-semibold mb-4">Quick Deposit</h3>
        <div className="grid grid-cols-3 gap-3">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => {
                setDepositAmount(amount)
                setShowPaymentModal(true)
              }}
              className="h-12 bg-white rounded-xl border border-gray-200 
                         font-medium text-body active:scale-95 transition-transform
                         hover:border-blue-300 hover:bg-blue-50"
            >
              ${amount}
            </button>
          ))}
        </div>
      </section>

      {/* Transaction History */}
      <section className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title-3 font-semibold">Transaction History</h3>
          <button className="p-2 bg-white rounded-full border border-gray-200">
            <Filter className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2 mb-4 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'deposits', label: 'Deposits' },
            { id: 'withdrawals', label: 'Withdrawals' },
            { id: 'bets', label: 'Bets' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id as any)}
              className={`px-4 py-2 rounded-full text-body-sm font-medium whitespace-nowrap
                         ${selectedFilter === filter.id
                           ? 'bg-blue-500 text-white'
                           : 'bg-white text-gray-600 border border-gray-200'
                         }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-body-sm text-gray-500">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h4 className="text-title-3 font-semibold mb-2">No transactions yet</h4>
              <p className="text-body text-gray-500 mb-4">
                Start by adding funds to your wallet
              </p>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="h-11 px-6 bg-blue-500 text-white font-medium rounded-[10px]"
              >
                Add Funds
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center p-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                    {getTransactionIcon(transaction.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-body font-medium">{transaction.description}</h4>
                    <p className="text-body-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-body font-semibold ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'deposit' || transaction.type === 'win' ? '+' : '-'}
                      ${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-caption-1 text-gray-500 capitalize">
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
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          />
          
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl 
                          shadow-2xl transform transition-all duration-300 ease-out">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h2 className="text-title-3 font-semibold">Withdraw Funds</h2>
                  <p className="text-body-sm text-gray-500">Transfer to your bank account</p>
                </div>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-body font-medium text-gray-900">
                  Amount to withdraw
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  min="5"
                  max={balance}
                  step="0.01"
                  className="w-full h-11 px-4 text-body bg-gray-100 
                           rounded-[10px] placeholder-gray-500
                           focus:bg-gray-200 transition-colors"
                  placeholder="Enter amount"
                />
                <p className="text-caption-1 text-gray-500">
                  Available: ${balance.toFixed(2)} | Min: $5.00
                </p>
              </div>

              <button
                onClick={handleWithdraw}
                disabled={withdrawAmount <= 0 || withdrawAmount > balance || loading}
                className="w-full h-[50px] bg-red-500 text-white font-semibold 
                           text-body rounded-[10px] disabled:opacity-50 
                           disabled:cursor-not-allowed active:scale-95 
                           transition-transform"
              >
                {loading ? 'Processing...' : `Withdraw $${withdrawAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletTab
