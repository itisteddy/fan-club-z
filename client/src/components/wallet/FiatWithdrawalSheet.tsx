/**
 * Fiat Withdrawal Sheet - Phase 7C
 * Allows users to request NGN withdrawal to their bank account
 */

import React, { useState, useCallback } from 'react';
import { X, Loader2, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useNigerianBanks, type FiatSummary } from '@/hooks/useFiatWallet';

interface FiatWithdrawalSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  fiatSummary: FiatSummary | null;
  onSuccess?: () => void;
}

const MIN_WITHDRAWAL_NGN = 200;

export const FiatWithdrawalSheet: React.FC<FiatWithdrawalSheetProps> = ({
  open,
  onClose,
  userId,
  fiatSummary,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [bankCode, setBankCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');

  const queryClient = useQueryClient();
  const { data: banks, isLoading: loadingBanks } = useNigerianBanks();

  const createWithdrawal = useMutation({
    mutationFn: async (data: {
      amountNgn: number;
      userId: string;
      bankCode: string;
      accountNumber: string;
      accountName?: string;
    }) => {
      return await apiClient.post('/fiat/withdrawals', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiat'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setStep('success');
      onSuccess?.();
    },
  });

  const availableNgn = fiatSummary?.availableNgn || 0;
  const amountNum = parseFloat(amount) || 0;
  const isValid = amountNum >= MIN_WITHDRAWAL_NGN && 
                  amountNum <= availableNgn && 
                  bankCode && 
                  accountNumber.length === 10;

  const selectedBank = banks?.find(b => b.code === bankCode);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  }, []);

  const handleAccountNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
    setAccountNumber(value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    if (step === 'form') {
      setStep('confirm');
      return;
    }

    try {
      await createWithdrawal.mutateAsync({
        amountNgn: amountNum,
        userId,
        bankCode,
        accountNumber,
        accountName: accountName || undefined,
      });
    } catch (err: any) {
      console.error('[FiatWithdrawal] Error:', err);
      toast.error(err?.response?.data?.message || 'Failed to create withdrawal request');
    }
  }, [isValid, step, amountNum, userId, bankCode, accountNumber, accountName, createWithdrawal]);

  const handleClose = useCallback(() => {
    setStep('form');
    setAmount('');
    setBankCode('');
    setAccountNumber('');
    setAccountName('');
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      
      <div className="relative w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl shadow-2xl z-10 mb-[calc(72px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Withdraw NGN</h2>
                <p className="text-sm text-gray-500">
                  Available: ₦{availableNgn.toLocaleString()}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {step === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Submitted</h3>
              <p className="text-sm text-gray-600 mb-4">
                Your withdrawal request for ₦{amountNum.toLocaleString()} has been submitted.
                It will be reviewed and processed shortly.
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Done
              </button>
            </div>
          ) : step === 'confirm' ? (
            <>
              <div className="bg-amber-50 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Please confirm your withdrawal</p>
                  <p>Double-check the bank details before submitting.</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-semibold">₦{amountNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank</span>
                  <span className="font-medium">{selectedBank?.name || bankCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account</span>
                  <span className="font-mono">{accountNumber}</span>
                </div>
                {accountName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name</span>
                    <span className="font-medium">{accountName}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('form')}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createWithdrawal.isPending}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {createWithdrawal.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Confirm Withdrawal'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₦</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 text-xl font-semibold border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>Min: ₦{MIN_WITHDRAWAL_NGN.toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => setAmount(availableNgn.toString())}
                    className="text-amber-600 font-medium hover:underline"
                  >
                    Max: ₦{availableNgn.toLocaleString()}
                  </button>
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank
                </label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  disabled={loadingBanks}
                >
                  <option value="">Select a bank</option>
                  {banks?.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={handleAccountNumberChange}
                  placeholder="Enter 10-digit account number"
                  maxLength={10}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
                />
                {accountNumber.length > 0 && accountNumber.length < 10 && (
                  <p className="mt-1 text-xs text-amber-600">{10 - accountNumber.length} digits remaining</p>
                )}
              </div>

              {/* Account Name (optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter account holder name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!isValid}
                className="w-full py-4 bg-amber-600 text-white rounded-xl font-semibold text-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue
              </button>

              <p className="text-center text-xs text-gray-400">
                Withdrawals are reviewed before processing
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiatWithdrawalSheet;
