/**
 * ReferralShareModal
 * 
 * A polished modal for sharing referral links with multiple sharing options.
 * Provides copy-to-clipboard, native share, and direct social sharing options.
 * 
 * Feature flag: VITE_REFERRALS_ENABLE=1
 */

import React, { useState, useCallback } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  MessageCircle, 
  Send, 
  Gift, 
  Users, 
  TrendingUp,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReferral } from '@/hooks/useReferral';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReferralShareModal: React.FC<ReferralShareModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isEnabled, referralCode, referralLink, stats, copyLink } = useReferral();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // Don't render if feature is disabled
  if (!isEnabled) return null;

  const handleCopy = useCallback(async () => {
    const success = await copyLink();
    if (success) {
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error('Failed to copy link');
    }
  }, [copyLink]);

  const handleNativeShare = useCallback(async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on FanClubZ!',
          text: 'Check out FanClubZ - predict outcomes on sports, entertainment, and more! Use my referral link to get started.',
          url: referralLink,
        });
        toast.success('Shared successfully!');
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  }, [referralLink, handleCopy]);

  const handleTwitterShare = useCallback(() => {
    if (!referralLink) return;
    const text = encodeURIComponent('I\'m using FanClubZ to predict outcomes on sports & entertainment! Join me and start making predictions:');
    const url = encodeURIComponent(referralLink);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=550,height=420');
  }, [referralLink]);

  const handleWhatsAppShare = useCallback(() => {
    if (!referralLink) return;
    const text = encodeURIComponent(`Check out FanClubZ! I've been using it to make predictions on sports & entertainment. Join me here: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }, [referralLink]);

  const handleTelegramShare = useCallback(() => {
    if (!referralLink) return;
    const text = encodeURIComponent('Check out FanClubZ - predict outcomes on sports & entertainment!');
    const url = encodeURIComponent(referralLink);
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
  }, [referralLink]);

  const handleEmailShare = useCallback(() => {
    if (!referralLink) return;
    const subject = encodeURIComponent('Join me on FanClubZ!');
    const body = encodeURIComponent(`Hey!\n\nI've been using FanClubZ to make predictions on sports, entertainment, and more. It's really fun!\n\nJoin me here: ${referralLink}\n\nLet's see who can make better predictions!`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [referralLink]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header with gradient */}
            <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 px-5 py-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Invite Friends</h2>
                  <p className="text-sm text-white/80">Share FanClubZ and grow the community</p>
                </div>
              </div>
            </div>

            {/* Stats Row (if available) */}
            {stats && (stats.totalSignups > 0 || stats.activeReferrals > 0) && (
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-bold text-emerald-700">{stats.totalSignups}</div>
                    <div className="text-xs text-emerald-600">Signups</div>
                  </div>
                  <div className="w-px h-10 bg-emerald-200" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-bold text-emerald-700">{stats.activeReferrals}</div>
                    <div className="text-xs text-emerald-600">Active</div>
                  </div>
                  <div className="w-px h-10 bg-emerald-200" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-bold text-emerald-700">{stats.totalClicks}</div>
                    <div className="text-xs text-emerald-600">Clicks</div>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Referral Link */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Your Referral Link
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 overflow-hidden">
                    <p className="text-sm text-gray-700 truncate font-mono">
                      {referralLink || 'Loading...'}
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    disabled={!referralCode}
                    className={cn(
                      'p-3 rounded-xl transition-all flex-shrink-0',
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95'
                    )}
                    title={copied ? 'Copied!' : 'Copy link'}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Share Options */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Share via
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {/* Native Share (on supported devices) */}
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs text-gray-600">Share</span>
                    </button>
                  )}

                  {/* Twitter/X */}
                  <button
                    onClick={handleTwitterShare}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                    <span className="text-xs text-gray-600">X</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs text-gray-600">WhatsApp</span>
                  </button>

                  {/* Telegram */}
                  <button
                    onClick={handleTelegramShare}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-sky-500 flex items-center justify-center">
                      <Send className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs text-gray-600">Telegram</span>
                  </button>

                  {/* Email */}
                  <button
                    onClick={handleEmailShare}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="M22 6L12 13L2 6"/>
                      </svg>
                    </div>
                    <span className="text-xs text-gray-600">Email</span>
                  </button>
                </div>
              </div>

              {/* Incentive hint */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Grow the Community</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Invite friends and climb the referral leaderboard! Top referrers get recognized in the community.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReferralShareModal;
