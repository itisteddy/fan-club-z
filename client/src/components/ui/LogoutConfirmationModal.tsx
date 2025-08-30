import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';
import { Button } from './button';

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-xl border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-8" /> {/* Spacer for centering */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sign Out</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-center">
          {/* Icon */}
          <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          
          {/* Title */}
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Are you sure you want to sign out?
          </h4>
          
          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You'll need to sign in again to access your predictions, wallet, and profile settings.
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing out...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Yes, Sign Out
                </div>
              )}
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              disabled={loading}
              className="w-full border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
