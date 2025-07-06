import React, { useState } from 'react'
import { Plus, Minus, Send, ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuthStore } from '@/store/authStore'
import { useWalletStore } from '@/store/walletStore'
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils'

// Mock transaction data
const mockTransactions = [
  {
    id: '1',
    type: 'deposit' as const,
    amount: 500,
    currency: 'USD' as const,
    status: 'completed' as const,
    description: 'Card deposit',
    createdAt: '2025-07-04T10:30:00Z',
  },
  {
    id: '2',
    type: 'bet_lock' as const,
    amount: 50,
    currency: 'USD' as const,
    status: 'completed' as const,
    description: 'Bet: Bitcoin to $100K',
    createdAt: '2025-07-04T09:15:00Z',
  },
  {
    id: '3',
    type: 'bet_release' as const,
    amount: 120,
    currency: 'USD' as const,
    status: 'completed' as const,
    description: 'Won: Premier League bet',
    createdAt: '2025-07-03T16:45:00Z',
  },
]

export const WalletTab: React.FC = () => {
  const { user } = useAuthStore()
  const { 
    balance, 
    currency, 
    openDepositModal, 
    openWithdrawModal, 
    openTransferModal 
  } = useWalletStore()
  
  const [activeTab, setActiveTab] = useState('overview')

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />
      case 'withdraw':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />
      case 'bet_lock':
        return <Minus className="w-4 h-4 text-orange-500" />
      case 'bet_release':
        return <Plus className="w-4 h-4 text-green-500" />
      case 'transfer':
        return <Send className="w-4 h-4 text-blue-500" />
      default:
        return <ArrowUpRight className="w-4 h-4 text-gray-500" />
    }
  }

  const getTransactionColor = (type: string) => {
    const isCredit = ['deposit', 'bet_release'].includes(type)
    return isCredit ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionSign = (type: string) => {
    const isCredit = ['deposit', 'bet_release'].includes(type)
    return isCredit ? '+' : '-'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Large Title Navigation */}
      <header className="sticky top-0 z-40">
        <div className="bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="px-4 pt-12 pb-2">
            <h1 className="text-display font-bold">Wallet</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pb-24">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl p-6 text-white mb-8">
          <div className="text-center mb-6">
            <p className="text-body opacity-90 mb-2">Available Balance</p>
            <h2 className="text-title-1 font-bold mb-4">
              {formatCurrency(balance, currency)}
            </h2>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={openDepositModal}
              variant="apple-secondary"
              size="apple-sm"
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Plus className="w-4 h-4 mr-1" />
              Deposit
            </Button>
            
            <Button
              onClick={openWithdrawModal}
              variant="apple-secondary"
              size="apple-sm"
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Minus className="w-4 h-4 mr-1" />
              Withdraw
            </Button>
            
            <Button
              onClick={openTransferModal}
              variant="apple-secondary"
              size="apple-sm"
              className="bg-white/20 text-white hover:bg-white/30"
            >
              <Send className="w-4 h-4 mr-1" />
              Send
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <ArrowDownLeft className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-title-3 font-bold text-gray-900">$1,250</div>
            <div className="text-caption-1 text-gray-500">Total Deposited</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Plus className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <div className="text-title-3 font-bold text-gray-900">$820</div>
            <div className="text-caption-1 text-gray-500">Total Won</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Minus className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <div className="text-title-3 font-bold text-gray-900">$730</div>
            <div className="text-caption-1 text-gray-500">Total Bet</div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-title-3 font-semibold text-gray-900">Recent Transactions</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {mockTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="text-body font-medium text-gray-900">{transaction.description}</p>
                      <p className="text-caption-1 text-gray-500">
                        {formatRelativeTime(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-body font-semibold",
                    getTransactionColor(transaction.type)
                  )}>
                    {getTransactionSign(transaction.type)}{formatCurrency(transaction.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-4 border-t border-gray-100">
            <Button variant="apple-secondary" className="w-full">
              View All Transactions
            </Button>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-title-3 font-semibold text-gray-900">Payment Methods</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-gray-900">Visa ending in 4242</p>
                    <p className="text-caption-1 text-gray-500">Expires 12/25</p>
                  </div>
                </div>
                <div className="text-caption-1 text-green-600 font-medium">Default</div>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-body font-medium text-gray-900">Apple Pay</p>
                    <p className="text-caption-1 text-gray-500">Connected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-100">
            <Button variant="apple-secondary" className="w-full">
              Add Payment Method
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WalletTab
