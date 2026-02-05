/**
 * Referral System Utilities
 * 
 * Handles referral code management, attribution, and tracking
 * Feature flag: VITE_REFERRALS_ENABLE=1
 */

import { getApiUrl } from '@/config';
import { buildReferralUrl } from '@/lib/urls';

const REFERRAL_COOKIE_NAME = 'ref_code';
const REFERRAL_STORAGE_KEY = 'fanclubz_ref_code';
const REFERRER_PREVIEW_KEY = 'fanclubz_referrer_preview';
const REFERRAL_COOKIE_EXPIRY_DAYS = 90;

const envFlag = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

/**
 * Check if referral feature is enabled
 */
export const isReferralEnabled = (): boolean => {
  return envFlag(import.meta.env.VITE_REFERRALS_ENABLE);
};

/**
 * Get the referral code from URL, cookie, or localStorage
 */
export const getRefCode = (): string | null => {
  if (!isReferralEnabled()) return null;
  
  // 1. Check URL parameters first (highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  const urlRefCode = urlParams.get('ref') || urlParams.get('ref_code');
  if (urlRefCode) {
    // Persist it
    setRefCode(urlRefCode);
    return urlRefCode;
  }
  
  // 2. Check cookie
  const cookieRefCode = getCookie(REFERRAL_COOKIE_NAME);
  if (cookieRefCode) return cookieRefCode;
  
  // 3. Check localStorage
  try {
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  } catch {
    return null;
  }
};

/**
 * Set the referral code in cookie and localStorage
 */
export const setRefCode = (code: string): void => {
  if (!isReferralEnabled() || !code) return;
  
  // Set cookie
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + REFERRAL_COOKIE_EXPIRY_DAYS);
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${REFERRAL_COOKIE_NAME}=${code}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${secure}`;
  
  // Set localStorage as backup
  try {
    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  } catch {
    // Ignore storage errors
  }
};

export interface ReferrerPreview {
  id: string;
  username: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  referralCode?: string | null;
}

export const setReferrerPreview = (preview: ReferrerPreview): void => {
  if (!isReferralEnabled() || !preview) return;
  try {
    localStorage.setItem(REFERRER_PREVIEW_KEY, JSON.stringify(preview));
  } catch {
    // Ignore storage errors
  }
};

export const getReferrerPreview = (): ReferrerPreview | null => {
  if (!isReferralEnabled()) return null;
  try {
    const raw = localStorage.getItem(REFERRER_PREVIEW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ReferrerPreview;
  } catch {
    return null;
  }
};

export const clearReferrerPreview = (): void => {
  try {
    localStorage.removeItem(REFERRER_PREVIEW_KEY);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Clear the referral code
 */
export const clearRefCode = (): void => {
  // Clear cookie
  document.cookie = `${REFERRAL_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  
  // Clear localStorage
  try {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
  clearReferrerPreview();
};

/**
 * Get a cookie value by name
 */
const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

/**
 * Generate the full referral link for a user (canonical domain; never localhost in production).
 */
export const getMyReferralLink = (referralCode: string | null | undefined): string | null => {
  if (!isReferralEnabled() || !referralCode) return null;
  return buildReferralUrl(referralCode);
};

/**
 * Copy referral link to clipboard
 */
export const copyReferralLink = async (referralCode: string): Promise<boolean> => {
  const link = getMyReferralLink(referralCode);
  if (!link) return false;
  
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * Attribute a referral to a user (called on first sign-in)
 */
export const attributeReferral = async (userId: string): Promise<{ attributed: boolean; reason?: string }> => {
  if (!isReferralEnabled()) return { attributed: false, reason: 'disabled' };
  
  const refCode = getRefCode();
  if (!refCode) return { attributed: false, reason: 'no_code' };
  
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/referrals/attribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        refCode,
      }),
    });
    
    if (!response.ok) {
      console.warn('[Referral] Attribution request failed:', response.status);
      return { attributed: false, reason: 'request_failed' };
    }
    
    const result = await response.json();
    
    if (result.data?.attributed) {
      // Clear the ref code after successful attribution
      clearRefCode();
      return { attributed: true };
    }
    
    return { attributed: false, reason: result.data?.reason || 'unknown' };
  } catch (error) {
    console.error('[Referral] Attribution error:', error);
    return { attributed: false, reason: 'error' };
  }
};

/**
 * Resolve a referral code to a public referrer preview.
 */
export const resolveReferrerPreview = async (refCode: string): Promise<ReferrerPreview | null> => {
  if (!isReferralEnabled() || !refCode) return null;
  try {
    const apiUrl = getApiUrl();
    const r = await fetch(`${apiUrl}/api/referrals/referrer?refCode=${encodeURIComponent(refCode)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    return (j?.data as ReferrerPreview) || null;
  } catch {
    return null;
  }
};

/**
 * Log a user login event (for active referral tracking)
 */
export const logReferralLogin = async (userId: string): Promise<void> => {
  if (!isReferralEnabled()) return;
  
  try {
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/referrals/log-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        source: 'web',
      }),
    });
  } catch (error) {
    // Non-blocking - don't fail the login
    console.warn('[Referral] Login log failed:', error);
  }
};

/**
 * Referral stats interface
 */
export interface ReferralStats {
  referralCode: string | null;
  referralLink: string | null;
  totalSignups: number;
  totalClicks: number;
  activeReferrals: number;
  conversionRate: number;
}

/**
 * Fetch user's referral statistics
 */
export const fetchMyReferralStats = async (userId: string): Promise<ReferralStats | null> => {
  if (!isReferralEnabled()) return null;
  
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/referrals/my-stats?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('[Referral] Failed to fetch stats:', response.status);
      return null;
    }
    
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error('[Referral] Stats fetch error:', error);
    return null;
  }
};

/**
 * Referral leaderboard entry interface
 */
export type OGBadgeTier = 'gold' | 'silver' | 'bronze';

export interface ReferralLeaderboardEntry {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  activeReferrals: number;
  totalSignups: number;
  totalClicks: number;
  conversionRate?: number;
  ogBadge?: OGBadgeTier | null;
}

/**
 * Fetch referral leaderboard
 */
export const fetchReferralLeaderboard = async (
  limit: number = 50,
  period: 'all' | '30d' | '7d' = 'all'
): Promise<ReferralLeaderboardEntry[]> => {
  if (!isReferralEnabled()) return [];
  
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(
      `${apiUrl}/api/leaderboard/referrals?limit=${limit}&period=${period}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      console.warn('[Referral] Leaderboard fetch failed:', response.status);
      return [];
    }
    
    const result = await response.json();
    return result.data?.items || [];
  } catch (error) {
    console.error('[Referral] Leaderboard error:', error);
    return [];
  }
};
