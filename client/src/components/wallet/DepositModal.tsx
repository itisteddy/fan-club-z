import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { useWalletStore } from '../../store/walletStore';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const quickAmounts = [500, 1000, 2500, 5000, 10000, 25000];

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { deposit } = useWalletStore();
  const numAmount = parseFloat(amount) || 0;

  const handleDeposit = async () => {
    if (!numAmount) {
      toast.error('Please enter an amount');
      return;
    }

    if (numAmount < 100) {
      toast.error('Minimum deposit is $100');
      return;
    }

    setIsLoading(true);
    try {
      await deposit('USD', numAmount, 'Demo Funds');
      toast.success('Demo funds added successfully!');
      onClose();
      setAmount('');
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
            onClick={onClose}
            style={{ zIndex: 8600 }}
          />
          
          {/* Modal Content */}
          <div className="deposit-modal fixed inset-0 flex items-end justify-center" style={{ zIndex: 8600, pointerEvents: 'none', bottom: 'calc(80px + env(safe-area-inset-bottom, 20px))' }}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="modal-container w-full max-w-md max-h-[calc(85vh-100px)]"
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {/* Header */}
              <div className="modal-header">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Deposit Funds</h2>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X size={20} />
                  </Button>
                </div>
              </div>

              {/* Body */}
              <div className="modal-body space-y-6">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount to deposit
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
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
                  <div className="text-xs text-gray-500 mt-1">
                    Minimum deposit: $100
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

                {/* Demo Funds Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Banknote size={20} />
                    <div className="font-medium">Demo Mode</div>
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    You're using demo funds for testing. No real money will be charged.
                  </div>
                </div>

                {/* Summary */}
                {numAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Demo Amount:</span>
                            <span className="font-medium">{formatCurrency(numAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Fee:</span>
                            <span className="font-medium text-green-600">Free</span>
                          </div>
                          <hr className="border-green-200" />
                          <div className="flex justify-between font-semibold">
                            <span>Total Added:</span>
                            <span className="text-green-600">
                              {formatCurrency(numAmount)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <Button
                  onClick={handleDeposit}
                  disabled={!numAmount || numAmount < 100 || isLoading}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="lg"
                >
                  {isLoading ? 'Adding Demo Funds...' : `Add ${formatCurrency(numAmount)} Demo Funds`}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};