/**
 * Phase 5 + Phase 8: Gate that shows Terms acceptance modal or Account Deleted restore screen.
 * Renders children; when terms not accepted, overlays blocking modal until user accepts.
 * When account is deleted (409 ACCOUNT_DELETED), shows restore prompt instead.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { getApiUrl } from '@/utils/environment';
import { TermsAcceptanceModal } from './TermsAcceptanceModal';
import { AccountDeletedModal } from './AccountDeletedModal';

type GateState = 'loading' | 'accepted' | 'needs_terms' | 'account_deleted' | 'account_suspended';

export function TermsAcceptanceGate({ children }: { children: React.ReactNode }) {
  const { user, session, initialized, signOut } = useAuthSession();
  const [state, setState] = useState<GateState>('loading');
  const [suspendedMessage, setSuspendedMessage] = useState<string>('');

  const authenticated = !!user && !!session?.access_token;

  useEffect(() => {
    if (!initialized || !authenticated) {
      setState(authenticated ? 'loading' : 'accepted');
      return;
    }
    let cancelled = false;
    setState('loading');
    (async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/v2/users/me/terms-accepted`, {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        });

        if (cancelled) return;

        if (res.status === 409) {
          // Account deleted
          const data = await res.json().catch(() => ({}));
          if (data.code === 'ACCOUNT_DELETED') {
            setState('account_deleted');
            return;
          }
        }

        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data.code === 'ACCOUNT_SUSPENDED') {
            setSuspendedMessage(data.message || 'This account has been suspended.');
            setState('account_suspended');
            return;
          }
        }

        const data = await res.json().catch(() => ({}));
        setState(data.accepted === true ? 'accepted' : 'needs_terms');
      } catch {
        if (!cancelled) setState('needs_terms');
      }
    })();
    return () => { cancelled = true; };
  }, [initialized, authenticated, session?.access_token]);

  const handleAcceptTerms = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${getApiUrl()}/api/v2/users/me/accept-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      if (data.code === 'ACCOUNT_DELETED') {
        setState('account_deleted');
        return;
      }
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || 'Failed to record acceptance');
    }
    setState('accepted');
  }, [session?.access_token]);

  const handleRestore = useCallback(async () => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const res = await fetch(`${getApiUrl()}/api/v2/users/me/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || 'Failed to restore account');
    }

    // Account restored — now check terms again
    setState('loading');
    try {
      const termsRes = await fetch(`${getApiUrl()}/api/v2/users/me/terms-accepted`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const termsData = await termsRes.json().catch(() => ({}));
      setState(termsData.accepted === true ? 'accepted' : 'needs_terms');
    } catch {
      setState('needs_terms');
    }
  }, [session?.access_token]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Force reload if signOut fails
      window.location.reload();
    }
  }, [signOut]);

  const showTermsModal = state === 'needs_terms';
  const showDeletedModal = state === 'account_deleted';
  const showSuspendedModal = state === 'account_suspended';

  return (
    <>
      {children}
      <TermsAcceptanceModal
        open={showTermsModal}
        onAccept={handleAcceptTerms}
        loading={state === 'loading'}
      />
      <AccountDeletedModal
        open={showDeletedModal}
        onRestore={handleRestore}
        onSignOut={handleSignOut}
      />
      {showSuspendedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Account suspended</h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                {suspendedMessage || 'This account has been suspended due to a policy violation.'}
              </p>
              <p className="text-sm text-gray-600">
                If you believe this is a mistake, please contact{' '}
                <a href="mailto:tech@fanclubz.app" className="text-emerald-600 hover:underline font-medium">
                  tech@fanclubz.app
                </a>
              </p>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2.5 bg-gray-600 text-white text-sm font-medium rounded-xl hover:bg-gray-700"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TermsAcceptanceGate;
