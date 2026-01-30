/**
 * useReferral Hook
 * 
 * React hook for referral system functionality
 * Feature flag: VITE_REFERRALS_ENABLE=1
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import toast from 'react-hot-toast';
import {
  isReferralEnabled,
  getRefCode,
  setRefCode,
  clearRefCode,
  getMyReferralLink,
  copyReferralLink,
  attributeReferral,
  logReferralLogin,
  fetchMyReferralStats,
  fetchReferralLeaderboard,
  getReferrerPreview,
  type ReferralStats,
  type ReferralLeaderboardEntry,
} from '@/lib/referral';

interface UseReferralReturn {
  // Feature state
  isEnabled: boolean;
  
  // Current user's referral info
  referralCode: string | null;
  referralLink: string | null;
  stats: ReferralStats | null;
  
  // Loading states
  statsLoading: boolean;
  
  // Actions
  copyLink: () => Promise<boolean>;
  refreshStats: () => Promise<void>;
}

/**
 * Hook for managing current user's referral state
 */
export const useReferral = (): UseReferralReturn => {
  const { user } = useAuthSession();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  const isEnabled = useMemo(() => isReferralEnabled(), []);
  
  // Get referral code from user metadata or stats
  const referralCode = useMemo(() => {
    // First try from stats
    if (stats?.referralCode) return stats.referralCode;
    
    // Then try from user metadata (would need to be added to user payload)
    const metadata = (user as any)?.user_metadata || {};
    return metadata.referral_code || null;
  }, [stats, user]);
  
  const referralLink = useMemo(() => {
    return getMyReferralLink(referralCode);
  }, [referralCode]);
  
  const refreshStats = useCallback(async () => {
    if (!isEnabled || !user?.id) return;
    
    setStatsLoading(true);
    try {
      const data = await fetchMyReferralStats(user.id);
      setStats(data);
    } finally {
      setStatsLoading(false);
    }
  }, [isEnabled, user?.id]);
  
  // Load stats on mount
  useEffect(() => {
    if (isEnabled && user?.id) {
      refreshStats();
    }
  }, [isEnabled, user?.id, refreshStats]);
  
  const copyLink = useCallback(async (): Promise<boolean> => {
    if (!referralCode) return false;
    return copyReferralLink(referralCode);
  }, [referralCode]);
  
  return {
    isEnabled,
    referralCode,
    referralLink,
    stats,
    statsLoading,
    copyLink,
    refreshStats,
  };
};

interface UseReferralLeaderboardReturn {
  isEnabled: boolean;
  entries: ReferralLeaderboardEntry[];
  loading: boolean;
  error: string | null;
  period: 'all' | '30d' | '7d';
  setPeriod: (period: 'all' | '30d' | '7d') => void;
  refresh: () => Promise<void>;
}

/**
 * Hook for referral leaderboard data
 */
export const useReferralLeaderboard = (
  initialPeriod: 'all' | '30d' | '7d' = 'all',
  limit: number = 50
): UseReferralLeaderboardReturn => {
  const [entries, setEntries] = useState<ReferralLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState(initialPeriod);
  
  const isEnabled = useMemo(() => isReferralEnabled(), []);
  
  const refresh = useCallback(async () => {
    if (!isEnabled) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchReferralLeaderboard(limit, period);
      setEntries(data);
    } catch (err) {
      setError('Failed to load referral leaderboard');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [isEnabled, limit, period]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  return {
    isEnabled,
    entries,
    loading,
    error,
    period,
    setPeriod,
    refresh,
  };
};

/**
 * Hook for handling referral link capture (on app load)
 * This extracts ref codes from URLs and stores them
 */
export const useReferralCapture = (): void => {
  const { user, initialized } = useAuthSession();

  useEffect(() => {
    if (!isReferralEnabled()) return;

    const maybeShowInviteToast = () => {
      try {
        const shownKey = 'fanclubz_ref_invite_toast_shown';
        if (!initialized) return;
        if (user?.id) return; // already signed in
        if (sessionStorage.getItem(shownKey)) return;
        const preview = getReferrerPreview();
        if (preview?.username) {
          toast.success(`Invited by @${preview.username}`, { duration: 3000 });
          sessionStorage.setItem(shownKey, '1');
        }
      } catch {
        // ignore
      }
    };
    
    // Check for ref code in URL path (e.g., /r/code123)
    const pathMatch = window.location.pathname.match(/^\/r\/([a-zA-Z0-9]+)/);
    if (pathMatch?.[1]) {
      setRefCode(pathMatch[1]);
      maybeShowInviteToast();
      return;
    }
    
    // Check for ref code in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || urlParams.get('ref_code');
    if (refParam) {
      setRefCode(refParam);
      maybeShowInviteToast();
    }
  }, [initialized, user?.id]);
};

/**
 * Hook for attributing referrals on first login (Phase 5: persistence + visual feedback)
 */
export const useReferralAttribution = (): void => {
  const { user, initialized } = useAuthSession();
  const [attributed, setAttributed] = useState(false);
  
  useEffect(() => {
    if (!isReferralEnabled() || !initialized || !user?.id || attributed) return;
    
    const handleAttribution = async () => {
      const refCode = getRefCode();
      if (!refCode) return;
      
      // Capture referrer preview before attribution (clearRefCode clears it on success)
      const referrerPreview = getReferrerPreview();
      
      const result = await attributeReferral(user.id);
      if (result.attributed) {
        console.log('[Referral] Successfully attributed');
        setAttributed(true);
        // Post-signup feedback: "You were referred by @username"
        if (referrerPreview?.username) {
          toast.success(`You were referred by @${referrerPreview.username}`, { duration: 4000 });
        } else {
          toast.success('Referral credited! Thanks for joining.', { duration: 3000 });
        }
      }
    };
    
    handleAttribution();
    // Log the login for active referral tracking (runs every time effect runs)
    logReferralLogin(user.id);
  }, [user?.id, initialized, attributed]);
};
