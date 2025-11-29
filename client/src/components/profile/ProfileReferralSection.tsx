/**
 * ProfileReferralSection
 * 
 * Displays user's referral information on their profile page.
 * Shows referral link and sharing options.
 * 
 * Features:
 * - Prominent referral link display
 * - One-tap copy functionality
 * - Native share integration
 * - Smooth animations
 * 
 * UX Principles:
 * - Make sharing effortless (< 2 taps)
 * - Visual feedback on copy success
 * - Clear CTA hierarchy
 */

import React, { useState, useCallback } from 'react';
import { Gift, Copy, Check, Share2, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReferral } from '@/hooks/useReferral';
import { isReferralEnabled } from '@/lib/referral';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface ProfileReferralSectionProps {
  isOwnProfile: boolean;
  className?: string;
  onOpenShareModal?: () => void;
  variant?: 'full' | 'compact';
}

export const ProfileReferralSection: React.FC<ProfileReferralSectionProps> = ({
  isOwnProfile,
  className,
  onOpenShareModal,
  variant = 'full',
}) => {
  const { isEnabled, referralCode, referralLink, stats, statsLoading, copyLink } = useReferral();
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyLink();
    if (success) {
      setCopied(true);
      toast.success('Link copied!', { 
        duration: 2000,
        icon: '✓',
        style: {
          background: '#10b981',
          color: 'white',
        },
      });
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error('Failed to copy', { duration: 2000 });
    }
  }, [copyLink]);

  const handleShare = useCallback(async () => {
    if (!referralLink) return;
    
    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on FanClubZ!',
          text: 'Check out FanClubZ - predict outcomes on sports, entertainment, and more! Use my referral link:',
          url: referralLink,
        });
        return;
      } catch (err) {
        // User cancelled or error - fall through
      }
    }
    
    // Fallback to modal or copy
    if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      handleCopy();
    }
  }, [referralLink, handleCopy, onOpenShareModal]);

  // Don't render if feature is disabled or not own profile
  if (!isEnabled || !isOwnProfile) return null;

  // Compact variant for smaller spaces
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'bg-gradient-to-r from-emerald-50 to-teal-50',
          'rounded-xl border border-emerald-100 p-3',
          className
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-emerald-800">Your Referral Link</p>
              <p className="text-xs text-emerald-600 truncate font-mono">
                {referralLink?.replace('https://', '') || 'Loading...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCopy}
            disabled={!referralCode}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
              copied 
                ? 'bg-emerald-500 text-white' 
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            )}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </motion.div>
    );
  }

  // Full variant - the default
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        'bg-white rounded-2xl border border-black/[0.06] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.div 
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm"
              animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            >
              <Gift className="w-4.5 h-4.5 text-white" />
            </motion.div>
            <h3 className="font-semibold text-gray-900 text-sm">Invite Friends</h3>
          </div>
          
          {/* Stats badge */}
          {stats && !statsLoading && stats.totalSignups > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 rounded-full"
            >
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">{stats.totalSignups}</span>
              <span className="text-xs text-emerald-600">signups</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Link section */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          {/* Link display */}
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 overflow-hidden">
            <p className="text-sm text-gray-700 truncate font-mono tracking-tight">
              {referralLink ? referralLink.replace('https://', '') : 'Loading...'}
            </p>
          </div>
          
          {/* Copy button */}
          <motion.button
            onClick={handleCopy}
            disabled={!referralCode}
            className={cn(
              'p-2.5 rounded-xl transition-all flex-shrink-0 relative overflow-hidden',
              copied
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700'
            )}
            whileTap={{ scale: 0.92 }}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Check className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
          
          {/* Share button */}
          <motion.button
            onClick={handleShare}
            disabled={!referralCode}
            className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200/50 hover:shadow-emerald-300/70 transition-all flex-shrink-0"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Loading state */}
        {statsLoading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
            Loading stats...
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProfileReferralSection;
