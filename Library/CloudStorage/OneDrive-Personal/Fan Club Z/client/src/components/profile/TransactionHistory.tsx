import React, { useState } from 'react'
import { TrendingUp, TrendingDown, Download, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface TransactionHistoryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface Transaction {
  id: string
  type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'refund'
  amount: number
  description: string
  date: string
  status: 'completed' | 'pending' | 'failed'
  reference: string
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  open,
  onOpenChange
}) => {
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'deposit',
      amount: 100,
      description: 'Deposit via Visa ending in 4242',
      date: '2025-07-08T14:30:00Z',
      status: 'completed',
      reference: 'DEP-001'
    },
    {
      id: '2',
      type: 'bet',
      amount: -25,
      description: 'Bet on Manchester City vs Arsenal',
      date: '2025-07-08T13:15:00Z',
      status: 'completed',
      reference: 'BET-001'
    },
    {
      id: '3',
      type: 'win',
      amount: 50,
      description: 'Won bet on Bitcoin price prediction',
      date: '2025-07-08T12:00:00Z',
      status: 'completed',
      reference: 'WIN-001'
    },
    {
      id: '4',
      type: 'withdrawal',
      amount: -75,
      description: 'Withdrawal to bank account',
      date: '2025-07-07T16:45:00Z',
      status: 'pending',
      reference: 'WTH-001'
    },
    {
      id: '5',
      type: 'refund',
      amount: 10,
      description: 'Refund for cancelled bet',
      date: '2025-07-07T10:20:00Z',
      status: 'completed',
      reference: 'REF-001'
    }
  ])

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || transaction.type === filterType
    return matchesSearch && matchesFilter
  })

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'withdrawal':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'bet':
        return <TrendingDown className="w-4 h-4 text-orange-600" />
      case 'win':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'refund':
        return <TrendingUp className="w-4 h-4 text-blue-600" />
      default:
        return <TrendingUp className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Export successful",
        description: "Your transaction history has been exported to CSV.",
      })
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export transaction history. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalWithdrawals = transactions
    .filter(t => t.type === 'withdrawal' && t.status === 'completed')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalWins = transactions
    .filter(t => t.type === 'win' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalBets = transactions
    .filter(t => t.type === 'bet' && t.status === 'completed')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <span>Transaction History</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-gray-600">Total Deposits</p>
                <p className="text-lg font-bold text-green-600">${totalDeposits}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-gray-600">Total Withdrawals</p>
                <p className="text-lg font-bold text-red-600">${totalWithdrawals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-gray-600">Total Wins</p>
                <p className="text-lg font-bold text-green-600">${totalWins}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <p className="text-sm text-gray-600">Total Bets</p>
                <p className="text-lg font-bold text-orange-600">${totalBets}</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-gray-100 rounded-[10px]"
                placeholder="Search transactions..."
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-11 px-4 bg-gray-100 rounded-[10px] border-none"
            >
              <option value="all">All Types</option>
              <option value="deposit">Deposits</option>
              <option value="withdrawal">Withdrawals</option>
              <option value="bet">Bets</option>
              <option value="win">Wins</option>
              <option value="refund">Refunds</option>
            </select>
            <Button
              onClick={handleExport}
              variant="outline"
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No transactions found</p>
              </div>
            ) : (
              filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                          {getTransactionIcon(transaction.type)}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-gray-600">
                            {formatDate(transaction.date)} • {transaction.reference}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Load More */}
          {filteredTransactions.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                toast({
                  title: "Loading more...",
                  description: "This would load more transactions in a real app.",
                })
              }}
            >
              Load More Transactions
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 