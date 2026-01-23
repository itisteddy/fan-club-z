/**
 * Fiat Deposit Sheet - Phase 7A
 * Allows users to deposit NGN via Paystack
 */

import React, { useState, useCallback } from 'react';
import { X, Loader2, CreditCard, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useInitializeDeposit, usePaystackStatus } from '@/hooks/useFiatWallet';

interface FiatDepositSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

export const FiatDepositSheet: React.FC<FiatDepositSheetProps> = ({
  open,
  onClose,
  userId,
  userEmail,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const { data: status } = usePaystackStatus();
  const { mutateAsync: initializeDeposit, isPending } = useInitializeDeposit();

  const minAmount = status?.minDepositNgn || 100;

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  }, []);

  const handlePresetClick = useCallback((preset: number) => {
    setAmount(preset.toString());
  }, []);

  const handleDeposit = useCallback(async () => {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum < minAmount) {
      toast.error(`Minimum deposit is ₦${minAmount}`);
      return;
    }

    try {
      const result = await initializeDeposit({
        amountNgn: amountNum,
        userId,
        email: userEmail,
      });

      if (result.authorizationUrl) {
        toast.success('Redirecting to Paystack...');
        // Redirect to Paystack checkout
        window.location.href = result.authorizationUrl;
      } else {
        toast.error('Failed to initialize payment');
      }
    } catch (err: any) {
      console.error('[FiatDeposit] Error:', err);
      toast.error(err?.response?.data?.message || 'Failed to start deposit');
    }
  }, [amount, minAmount, initializeDeposit, userId, userEmail]);

  if (!open) return null;

  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum >= minAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl z-10 mb-[calc(72px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Deposit NGN</h2>
                <p className="text-sm text-gray-500">Via Paystack</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (NGN)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">
                ₦
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 text-2xl font-semibold text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Minimum deposit: ₦{minAmount.toLocaleString()}
            </p>
          </div>

          {/* Preset Amounts */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Select
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    parseFloat(amount) === preset
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ₦{preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">How it works</p>
              <p className="text-blue-700">
                You'll be redirected to Paystack to complete your payment securely. 
                Your balance will update automatically once payment is confirmed.
              </p>
            </div>
          </div>

          {/* Deposit Button */}
          <button
            onClick={handleDeposit}
            disabled={!isValid || isPending}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-semibold text-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Deposit ₦{amountNum > 0 ? amountNum.toLocaleString() : '0'}
              </>
            )}
          </button>

          {/* Powered by */}
          <p className="text-center text-xs text-gray-400">
            Secured by Paystack
          </p>
        </div>
      </div>
    </div>
  );
};

export default FiatDepositSheet;
