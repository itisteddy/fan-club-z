/**
 * Phase 8: Modal shown when a deleted user signs back in.
 * Offers a clear option to restore the account or sign out.
 */

import React, { useState } from 'react';

export interface AccountDeletedModalProps {
  open: boolean;
  onRestore: () => Promise<void>;
  onSignOut: () => void;
}

export function AccountDeletedModal({ open, onRestore, onSignOut }: AccountDeletedModalProps) {
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRestore = async () => {
    setError(null);
    setRestoring(true);
    try {
      await onRestore();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Account deleted</h2>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            This account was previously deleted. Your profile data was anonymized,
            but you can restore it to continue using the app.
          </p>
          <p className="text-sm text-gray-600">
            After restoring, you may need to set up your profile again (username, display name, avatar).
          </p>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-between">
          <button
            type="button"
            onClick={onSignOut}
            disabled={restoring}
            className="px-4 py-2.5 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-100 disabled:opacity-50"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {restoring ? 'Restoring…' : 'Restore account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AccountDeletedModal;
