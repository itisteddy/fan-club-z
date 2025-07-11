import React, { useState } from 'react'
import { CreditCard, Plus, Trash2, Edit, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'

interface PaymentMethodsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PaymentMethod {
  id: string
  type: 'card' | 'bank' | 'paypal'
  name: string
  last4?: string
  brand?: string
  isDefault: boolean
  expiryDate?: string
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({
  open,
  onOpenChange
}) => {
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const { toast } = useToast()

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      name: 'Visa ending in 4242',
      last4: '4242',
      brand: 'Visa',
      isDefault: true,
      expiryDate: '12/25'
    },
    {
      id: '2',
      type: 'card',
      name: 'Mastercard ending in 5555',
      last4: '5555',
      brand: 'Mastercard',
      isDefault: false,
      expiryDate: '08/26'
    }
  ])

  const [newMethod, setNewMethod] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    isDefault: false
  })

  const handleAddMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newPaymentMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: 'card',
        name: `${newMethod.cardholderName} ending in ${newMethod.cardNumber.slice(-4)}`,
        last4: newMethod.cardNumber.slice(-4),
        brand: 'Visa', // Would be determined by card number
        isDefault: newMethod.isDefault,
        expiryDate: newMethod.expiryDate
      }

      if (newMethod.isDefault) {
        setPaymentMethods(prev => 
          prev.map(method => ({ ...method, isDefault: false }))
        )
      }

      setPaymentMethods(prev => [...prev, newPaymentMethod])
      setNewMethod({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardholderName: '',
        isDefault: false
      })
      setShowAddForm(false)
      
      toast({
        title: "Payment method added",
        description: "Your new payment method has been added successfully.",
      })
    } catch (error) {
      toast({
        title: "Add failed",
        description: "Failed to add payment method. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteMethod = async (id: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPaymentMethods(prev => prev.filter(method => method.id !== id))
      
      toast({
        title: "Payment method removed",
        description: "Your payment method has been removed successfully.",
      })
    } catch (error) {
      toast({
        title: "Remove failed",
        description: "Failed to remove payment method. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setPaymentMethods(prev => 
        prev.map(method => ({ 
          ...method, 
          isDefault: method.id === id 
        }))
      )
      
      toast({
        title: "Default updated",
        description: "Your default payment method has been updated.",
      })
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update default payment method. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getCardIcon = (brand?: string) => {
    switch (brand?.toLowerCase()) {
      case 'visa':
        return '💳'
      case 'mastercard':
        return '💳'
      case 'amex':
        return '💳'
      default:
        return '💳'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <span>Payment Methods</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Payment Methods */}
          {paymentMethods.map((method) => (
            <Card key={method.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{getCardIcon(method.brand)}</div>
                    <div>
                      <p className="font-medium">{method.name}</p>
                      <p className="text-sm text-gray-600">
                        Expires {method.expiryDate}
                        {method.isDefault && (
                          <span className="ml-2 text-blue-600 font-medium">Default</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                        disabled={loading}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMethod(method)}
                      disabled={loading}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMethod(method.id)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Payment Method */}
          {!showAddForm ? (
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-4">Add New Card</h3>
                <form onSubmit={handleAddMethod} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Card Number</label>
                    <input
                      type="text"
                      value={newMethod.cardNumber}
                      onChange={(e) => setNewMethod({ ...newMethod, cardNumber: e.target.value })}
                      className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                      placeholder="1234 5678 9012 3456"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Expiry Date</label>
                      <input
                        type="text"
                        value={newMethod.expiryDate}
                        onChange={(e) => setNewMethod({ ...newMethod, expiryDate: e.target.value })}
                        className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                        placeholder="MM/YY"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">CVV</label>
                      <input
                        type="text"
                        value={newMethod.cvv}
                        onChange={(e) => setNewMethod({ ...newMethod, cvv: e.target.value })}
                        className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                        placeholder="123"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                    <input
                      type="text"
                      value={newMethod.cardholderName}
                      onChange={(e) => setNewMethod({ ...newMethod, cardholderName: e.target.value })}
                      className="w-full h-11 px-4 bg-gray-100 rounded-[10px]"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="default"
                      checked={newMethod.isDefault}
                      onChange={(e) => setNewMethod({ ...newMethod, isDefault: e.target.checked })}
                      className="rounded"
                    />
                    <label htmlFor="default" className="text-sm">Set as default payment method</label>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={loading}
                    >
                      {loading ? 'Adding...' : 'Add Card'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Security Notice */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
            <Lock className="w-4 h-4 text-blue-500 mt-0.5" />
            <p className="text-xs text-blue-700">
              Your payment information is encrypted and secure. We never store your full card details.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 