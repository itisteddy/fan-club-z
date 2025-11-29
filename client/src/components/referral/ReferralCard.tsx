/**
 * ReferralCard Component
 * 
 * Displays user's referral link with copy functionality and stats
 * Feature flag: VITE_REFERRALS_ENABLE=1
 */

import React, { useState, useCallback } from 'react';
import { Gift, Copy, Check, Users, TrendingUp, Share2, ExternalLink } from 'lucide-react';
import { useReferral } from '@/hooks/useReferral';
import { isReferralEnabled } from '@/lib/referral';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface ReferralCardProps {
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
}

export const ReferralCard: React.FC<ReferralCardProps> = ({ 
  className,
  variant = 'full'
}) => {
  const { isEnabled, referralCode, referralLink, stats, statsLoading, copyLink } = useReferral();
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(async () => {
    const success = await copyLink();
    if (success) {
      setCopied(true);
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  }, [copyLink]);
  
  const handleShare = useCallback(async () => {
    if (!referralLink) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on FanClubZ!',
          text: 'Check out FanClubZ - predict outcomes on sports, entertainment, and more!',
          url: referralLink,
        });
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  }, [referralLink, handleCopy]);
  
  // Don't render if feature is disabled
  if (!isEnabled) return null;
  
  // Minimal variant - just the copy button with link
  if (variant === 'minimal') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-sm text-gray-600 truncate max-w-[200px]">
          {referralLink || 'No referral link'}
        </span>
        <button
          onClick={handleCopy}
          disabled={!referralCode}
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            copied 
              ? 'bg-emerald-100 text-emerald-600' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
          title="Copy referral link"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    );
  }
  
  // Compact variant - single row with link and copy
  if (variant === 'compact') {
    return (
      <div className={cn(
        'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3',
        'border border-emerald-100',
        className
      )}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-800">Your Referral Link</p>
              <p className="text-xs text-emerald-600 truncate">
                {referralLink || 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            disabled={!referralCode}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
              copied 
                ? 'bg-emerald-500 text-white' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
  
  // Full variant - card with stats
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-black/[0.06] overflow-hidden',
      className
    )}>
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">Invite Friends</h3>
            <p className="text-sm text-white/80">Share FanClubZ and earn rewards</p>
          </div>
        </div>
      </div>
      
      {/* Link section */}
      <div className="p-4">
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Your Referral Link
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            <p className="text-sm text-gray-700 truncate font-mono">
              {referralLink || 'Loading...'}
            </p>
          </div>
          <button
            onClick={handleCopy}
            disabled={!referralCode}
            className={cn(
              'p-2.5 rounded-lg transition-all',
              copied 
                ? 'bg-emerald-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <button
            onClick={handleShare}
            disabled={!referralCode}
            className="p-2.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        
        {/* Stats grid */}
        {stats && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Users className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalSignups}
              </p>
              <p className="text-xs text-gray-500">Signups</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {statsLoading ? '...' : stats.activeReferrals}
              </p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {statsLoading ? '...' : stats.totalClicks}
              </p>
              <p className="text-xs text-gray-500">Clicks</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralCard;
