/**
 * Phase 5: Gate that shows Terms acceptance modal when user is authenticated but has not accepted current terms.
 * Renders children; when terms not accepted, overlays blocking modal until user accepts.
 */

import React, { useEffect, useState } from 'react';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { getApiUrl } from '@/utils/environment';
import { TermsAcceptanceModal } from './TermsAcceptanceModal';

export function TermsAcceptanceGate({ children }: { children: React.ReactNode }) {
  const { user, session, initialized } = useAuthSession();
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const authenticated = !!user && !!session?.access_token;

  useEffect(() => {
    if (!initialized || !authenticated) {
      setTermsAccepted(authenticated ? null : true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${getApiUrl()}/api/v2/users/me/terms-accepted`, {
          headers: { Authorization: `Bearer ${session!.access_token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          setTermsAccepted(data.accepted === true);
        }
      } catch {
        if (!cancelled) setTermsAccepted(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [initialized, authenticated, session?.access_token]);

  const showModal = authenticated && !loading && termsAccepted === false;

  const handleAccept = async () => {
    if (!session?.access_token) return;
    const res = await fetch(`${getApiUrl()}/api/v2/users/me/accept-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || 'Failed to record acceptance');
    }
    setTermsAccepted(true);
  };

  return (
    <>
      {children}
      <TermsAcceptanceModal open={showModal} onAccept={handleAccept} loading={loading} />
    </>
  );
}

export default TermsAcceptanceGate;
