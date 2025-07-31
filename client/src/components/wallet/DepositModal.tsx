import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { useWalletStore } from '../../stores/walletStore';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const depositMethods = [
  {
    id: 'card',
    name: 'Debit Card',
    icon: CreditCard,
    description: 'Instant deposit via card',
    fee: '2.5%',
  },
  {
    id: 'transfer',
    name: 'Bank Transfer',
    icon: Banknote,
    description: 'Transfer from your bank',
    fee: 'Free',
  },
  {
    id: 'ussd',
    name: 'USSD',
    icon: Smartphone,
    description: 'Dial *737# to deposit',
    fee: '₦50',
  },
];

const quickAmounts = [500, 1000, 2500, 5000, 10000, 25000];

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { deposit } = useWalletStore();
  const numAmount = parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (!selectedMethod || !numAmount) {
      toast.error('Please select a method and enter an amount');
      return;
    }

    if (numAmount < 100) {
      toast.error('Minimum deposit is ₦100');
      return;
    }

    setIsLoading(true);
    try {
      await deposit('NGN', numAmount, selectedMethod);
      toast.success('Deposit initiated successfully!');
      onClose();
      setAmount('');
      setSelectedMethod('');
    } catch (error) {
      toast.error('Deposit failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000,
              pointerEvents: 'auto'
            }}
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 flex items-end justify-center pointer-events-none" style={{ zIndex: 1001, bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))' }}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-background rounded-t-3xl w-full max-w-md max-h-[calc(85vh-100px)] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
          <div className="sticky top-0 bg-background border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Deposit Funds</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount to deposit
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ₦
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg"
                  min={100}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Minimum deposit: ₦100
              </div>
            </div>

            {/* Quick amounts */}
            <div>
              <label className="block text-sm font-medium mb-2">Quick amounts:</label>
              <div className="grid grid-cols-3 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(quickAmount.toString())}
                    className="text-sm"
                  >
                    {formatCurrency(quickAmount)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Deposit Methods */}
            <div>
              <label className="block text-sm font-medium mb-3">Choose payment method:</label>
              <div className="space-y-2">
                {depositMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all ${
                        selectedMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/30'
                      }`}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <Icon size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {method.description}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-primary">
                            {method.fee}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            {numAmount > 0 && selectedMethod && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">{formatCurrency(numAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fee:</span>
                        <span className="font-medium">
                          {selectedMethod === 'card' ? formatCurrency(numAmount * 0.025) :
                           selectedMethod === 'ussd' ? '₦50' : 'Free'}
                        </span>
                      </div>
                      <hr className="border-primary/20" />
                      <div className="flex justify-between font-semibold">
                        <span>Total to pay:</span>
                        <span className="text-primary">
                          {selectedMethod === 'card' 
                            ? formatCurrency(numAmount + (numAmount * 0.025))
                            : selectedMethod === 'ussd'
                            ? formatCurrency(numAmount + 50)
                            : formatCurrency(numAmount)
                          }
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Submit Button */}
          <div className="sticky bottom-0 bg-background border-t border-border p-6">
            <Button
              onClick={handleDeposit}
              disabled={!selectedMethod || !numAmount || numAmount < 100 || isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Processing...' : `Deposit ${formatCurrency(numAmount)}`}
            </Button>
          </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
