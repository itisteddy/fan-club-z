/**
 * Phase 5: Blocking modal for Terms / Privacy / Community Guidelines acceptance.
 * Shown once per user (or once per version bump). Required before using UGC features.
 */

import React, { useState } from 'react';
import { openTerms, openPrivacy, getLegalUrl } from '@/utils/openExternalUrl';

const SUPPORT_URL = 'https://app.fanclubz.app/support';
const SUPPORT_EMAIL = 'tech@fanclubz.app';

export interface TermsAcceptanceModalProps {
  open: boolean;
  onAccept: () => Promise<void>;
  loading?: boolean;
}

export function TermsAcceptanceModal({ open, onAccept, loading }: TermsAcceptanceModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setError(null);
    setAccepting(true);
    try {
      await onAccept();
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (!open) return null;

  const busy = loading || accepting;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Agreement required</h2>
          <p className="text-sm text-gray-600 mt-1">
            To create predictions, comment, or use other community features, you must accept the following.
          </p>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-sm text-gray-700">
            <strong>Zero tolerance:</strong> By continuing you agree to these documents. Violations may result in
            removal of content or account suspension.
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <button
                type="button"
                onClick={() => openTerms()}
                className="text-emerald-600 hover:underline font-medium"
              >
                Terms of Service
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => openPrivacy()}
                className="text-emerald-600 hover:underline font-medium"
              >
                Privacy Policy
              </button>
            </li>
            <li>
              <a
                href={getLegalUrl('/terms')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline font-medium"
              >
                Community Guidelines
              </a>
              <span className="text-gray-600 ml-1">(no objectionable content or abuse)</span>
            </li>
          </ul>
          <p className="text-xs text-gray-500">
            Questions? Contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-600 hover:underline">
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="p-4 sm:p-5 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleAccept}
            disabled={busy}
            className="px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? 'Accepting…' : 'I Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TermsAcceptanceModal;
