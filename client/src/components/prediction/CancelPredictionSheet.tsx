import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/utils/environment';
import type { Prediction } from '@/store/predictionStore';
import { supabase } from '@/lib/supabase';

interface CancelPredictionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prediction: Prediction;
  onCancelled: (updatedPrediction: Prediction) => void;
  userId?: string;
}

export function CancelPredictionSheet({
  open,
  onOpenChange,
  prediction,
  onCancelled,
  userId,
}: CancelPredictionSheetProps) {
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }

    setIsCancelling(true);
    try {
      // Prefer the passed in authenticated userId
      const effectiveUserId =
        userId ||
        (window as any).__FCZ_USER_ID ||
        localStorage.getItem('userId') ||
        (window as any).__FCZ_CURRENT_USER?.id;

      if (!effectiveUserId) {
        toast.error('Please sign in to cancel predictions');
        setIsCancelling(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: null } as any));
      const accessToken = sessionData?.session?.access_token || null;

      const response = await fetch(`${getApiUrl()}/api/v2/predictions/${prediction.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: reason.trim(),
          userId: effectiveUserId,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || 'Failed to cancel prediction');
      }

      await response.json().catch(() => null);
      toast.success('Prediction cancelled. Refunds initiated.');
      
      // Update prediction status locally
      onCancelled({
        ...prediction,
        status: 'cancelled',
      });
      
      onOpenChange(false);
      setReason('');
    } catch (error: any) {
      console.error('[CancelPredictionSheet] Cancel failed:', error);
      toast.error(error.message || 'Failed to cancel prediction');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between z-10">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Cancel prediction?</Dialog.Title>
            <Dialog.Close className="p-2 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-500" />
            </Dialog.Close>
          </div>

          <div className="px-4 py-6 space-y-6">
            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900">This action cannot be undone</p>
                <p className="text-xs text-red-700 mt-1">
                  All participants will receive refunds. The prediction will be marked as cancelled.
                </p>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Explain why you're cancelling this prediction (minimum 5 characters)"
                minLength={5}
              />
              <p className="text-xs text-gray-500 mt-1">
                {reason.length}/5 minimum characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  setReason('');
                }}
                disabled={isCancelling}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Keep prediction
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling || reason.trim().length < 5}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel prediction'
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
