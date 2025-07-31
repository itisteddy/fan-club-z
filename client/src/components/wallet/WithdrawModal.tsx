import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent } from '../ui/card';
import { useWalletStore } from '../../stores/walletStore';
import { formatCurrency } from '../../lib/utils';
import toast from 'react-hot-toast';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { balances, withdraw } = useWalletStore();
  const ngnBalance = balances.find(b => b.currency === 'NGN')?.available_balance || 0;
  const numAmount = parseFloat(amount) || 0;

  const handleWithdraw = async () => {
    if (!amount || !accountName || !accountNumber || !bankCode) {
      toast.error('Please fill in all fields');
      return;
    }

    if (numAmount < 500) {
      toast.error('Minimum withdrawal is ₦500');
      return;
    }

    if (numAmount > ngnBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsLoading(true);
    try {
      const destination = JSON.stringify({
        account_name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
      });
      
      await withdraw('NGN', numAmount, destination);
      toast.success('Withdrawal initiated successfully!');
      onClose();
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setBankCode('');
    } catch (error) {
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickAmounts = [500, 1000, 2500, 5000];
  const availableQuickAmounts = quickAmounts.filter(qa => qa <= ngnBalance);

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
              <h2 className="text-lg font-semibold">Withdraw Funds</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={20} />
              </Button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-6 max-h-[calc(90vh-80px)] overflow-y-auto">
            {/* Balance Info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Banknote size={16} />
                    <span className="text-sm text-muted-foreground">Available Balance</span>
                  </div>
                  <div className="font-semibold text-primary">
                    {formatCurrency(ngnBalance)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount to withdraw
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
                  min={500}
                  max={ngnBalance}
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Minimum withdrawal: ₦500
              </div>
            </div>

            {/* Quick amounts */}
            {availableQuickAmounts.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Quick amounts:</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableQuickAmounts.map((quickAmount) => (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(ngnBalance.toString())}
                    className="text-sm col-span-2"
                  >
                    Withdraw All ({formatCurrency(ngnBalance)})
                  </Button>
                </div>
              </div>
            )}

            {/* Bank Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Bank Details</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Account Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter account name"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Account Number
                </label>
                <Input
                  type="text"
                  placeholder="Enter account number"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Bank
                </label>
                <select
                  className="w-full h-12 px-4 rounded-lg border border-input bg-background text-sm"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                >
                  <option value="">Select your bank</option>
                  <option value="044">Access Bank</option>
                  <option value="014">Afribank</option>
                  <option value="023">Citibank</option>
                  <option value="050">Ecobank</option>
                  <option value="011">First Bank</option>
                  <option value="214">First City Monument Bank</option>
                  <option value="070">Fidelity Bank</option>
                  <option value="058">Guaranty Trust Bank</option>
                  <option value="030">Heritage Bank</option>
                  <option value="301">Jaiz Bank</option>
                  <option value="082">Keystone Bank</option>
                  <option value="221">Stanbic IBTC Bank</option>
                  <option value="068">Standard Chartered Bank</option>
                  <option value="232">Sterling Bank</option>
                  <option value="033">United Bank for Africa</option>
                  <option value="032">Union Bank</option>
                  <option value="035">Wema Bank</option>
                  <option value="057">Zenith Bank</option>
                </select>
              </div>
            </div>

            {/* Warning */}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium text-amber-800 mb-1">
                      Important Notice
                    </div>
                    <div className="text-amber-700">
                      Withdrawals are processed within 1-3 business days. Ensure your bank details are correct as transactions cannot be reversed.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {numAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Withdrawal amount:</span>
                        <span className="font-medium">{formatCurrency(numAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Processing fee:</span>
                        <span className="font-medium">Free</span>
                      </div>
                      <hr className="border-primary/20" />
                      <div className="flex justify-between font-semibold">
                        <span>You will receive:</span>
                        <span className="text-primary">{formatCurrency(numAmount)}</span>
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
              onClick={handleWithdraw}
              disabled={
                !amount || !accountName || !accountNumber || !bankCode ||
                numAmount < 500 || numAmount > ngnBalance || isLoading
              }
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Processing...' : `Withdraw ${formatCurrency(numAmount)}`}
            </Button>
          </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
