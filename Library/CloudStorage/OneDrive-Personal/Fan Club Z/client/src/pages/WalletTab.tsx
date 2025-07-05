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
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wallet 💰
          </h1>
          <p className="text-gray-600">
            Manage your funds and track transactions
          </p>
        </div>

        {/* Balance Card */}
        <Card className="mb-6 bg-gradient-to-r from-primary to-primary-600 text-white">
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-primary-100 text-sm mb-2">Available Balance</p>
              <h2 className="text-4xl font-bold mb-4">
                {formatCurrency(balance, currency)}
              </h2>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={openDepositModal}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Deposit
                </Button>
                
                <Button
                  onClick={openWithdrawModal}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Minus className="w-4 h-4 mr-1" />
                  Withdraw
                </Button>
                
                <Button
                  onClick={openTransferModal}
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 text-white border-white/30 hover:bg-white/30"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <ArrowDownLeft className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">$1,250</div>
              <div className="text-xs text-gray-600">Total Deposited</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Plus className="w-6 h-6 text-green-500 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">$820</div>
              <div className="text-xs text-gray-600">Total Won</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Minus className="w-6 h-6 text-orange-500 mx-auto mb-2" />
              <div className="text-lg font-bold text-gray-900">$730</div>
              <div className="text-xs text-gray-600">Total Bet</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="methods">Methods</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-4">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockTransactions.slice(0, 3).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center space-x-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {formatRelativeTime(transaction.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          "font-semibold text-sm",
                          getTransactionColor(transaction.type)
                        )}>
                          {getTransactionSign(transaction.type)}{formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full mt-4" size="sm">
                    View All Transactions
                  </Button>
                </CardContent>
              </Card>

              {/* Betting Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Betting Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">68%</div>
                      <div className="text-sm text-gray-600">Win Rate</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">24</div>
                      <div className="text-sm text-gray-600">Total Bets</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <p className="font-medium text-sm">{transaction.description}</p>
                          <p className="text-xs text-gray-500">
                            {formatRelativeTime(transaction.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "font-semibold text-sm",
                          getTransactionColor(transaction.type)
                        )}>
                          {getTransactionSign(transaction.type)}{formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="methods">
            <div className="space-y-4">
              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="w-6 h-6 text-gray-400" />
                        <div>
                          <p className="font-medium">Credit/Debit Card</p>
                          <p className="text-sm text-gray-500">Instant deposits</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Add Card
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-6 h-6 text-gray-400" />
                        <div>
                          <p className="font-medium">Mobile Money</p>
                          <p className="text-sm text-gray-500">Local payment methods</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Connect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Security</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Two-Factor Authentication</span>
                      <span className="text-green-600 font-medium">Enabled</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Withdrawal Limits</span>
                      <span className="text-gray-600">$10,000/day</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>KYC Verification</span>
                      <span className="text-green-600 font-medium">Verified</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default WalletTab
