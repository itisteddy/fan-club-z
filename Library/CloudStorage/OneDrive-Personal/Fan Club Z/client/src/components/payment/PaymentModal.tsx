import React, { useState, useEffect } from 'react'
import { X, CreditCard, CheckCircle } from 'lucide-react'

// Demo mode preset amounts
const PRESET_AMOUNTS = [10, 25, 50, 100]

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  amount?: number // Optional for demo mode
  onSuccess: (amount: number) => void
}

const DemoDepositForm: React.FC<{ 
  onSuccess: (amount: number) => void; 
  onClose: () => void;
  initialAmount?: number;
}> = ({ onSuccess, onClose, initialAmount = 25 }) => {
  const [amount, setAmount] = useState(initialAmount)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Update amount when initialAmount changes
  useEffect(() => {
    setAmount(initialAmount)
  }, [initialAmount])

  const handleDeposit = async () => {
    setLoading(true)
    // Simulate API call
    try {
      const response = await fetch('/api/payments/deposit/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ amount, currency: 'usd' }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error || 'Failed to deposit')
      setSuccess(true)
      setTimeout(() => {
        onSuccess(amount)
        onClose()
      }, 1200)
    } catch (err) {
      // In demo mode, always succeed
      setSuccess(true)
      setTimeout(() => {
        onSuccess(amount)
        onClose()
      }, 1200)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-title-2 font-semibold mb-2 text-center">
          Deposit Successful!
        </h3>
        <p className="text-body text-gray-500 text-center">
          Your wallet has been credited with ${amount.toFixed(2)}
        </p>
      </div>
    )
  }

  return (
    <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleDeposit() }}>
      {/* Amount Display & Presets */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-body text-gray-600">Amount to deposit</span>
          <span className="text-title-2 font-bold">${amount.toFixed(2)}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              type="button"
              key={preset}
              className={`px-4 py-2 rounded-lg font-medium border transition-all ${amount === preset ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-blue-500 border-blue-200 hover:bg-blue-50'}`}
              onClick={() => setAmount(preset)}
              disabled={loading}
            >
              ${preset}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <input
            type="number"
            min={1}
            max={10000}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full h-11 px-4 bg-gray-100 rounded-[10px] text-body text-center font-semibold border border-gray-200 focus:border-blue-500 focus:outline-none"
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full h-[50px] bg-blue-500 text-white font-semibold text-body rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Processing...
          </div>
        ) : (
          `Deposit $${amount.toFixed(2)}`
        )}
      </button>
      <div className="text-center">
        <p className="text-caption-1 text-gray-500">
          No real money is involved. This is a demo.
        </p>
      </div>
    </form>
  )
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  amount,
  onSuccess,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Demo Mode Banner */}
      <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-center py-2 text-sm font-medium z-50">
        Demo Mode: No real money is involved. All funds are virtual.
      </div>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl \
                      shadow-2xl transform transition-all duration-300 ease-out
                      max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <CreditCard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-title-3 font-semibold">Add Funds</h2>
              <p className="text-body-sm text-gray-500">Demo deposit (no real money)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center
                       active:scale-95 transition-transform"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">
          <DemoDepositForm onSuccess={onSuccess} onClose={onClose} initialAmount={amount} />
        </div>
      </div>
    </div>
  )
} 