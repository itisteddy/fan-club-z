/**
 * ReferralSuccessToast
 * 
 * Celebratory toast notification when a referral is successful.
 * Shows the referee's info and a celebration animation.
 * 
 * Use Cases:
 * - New referral signup notification
 * - Milestone celebrations (5, 10, 25, 50, 100 referrals)
 * 
 * UX Principles:
 * - Immediate positive feedback
 * - Celebratory but not disruptive
 * - Clear dismissal option
 * - Extra celebration for milestones
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, X, Users, TrendingUp, Crown, Star, Target, Zap, Trophy, Gem, Flame } from 'lucide-react';
import toast, { Toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';

interface ReferralSuccessToastProps {
  t: Toast;
  refereeName: string;
  refereeAvatar?: string;
  milestoneCount?: number;
}

// Milestone thresholds
const MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];

const getMilestoneIcon = (count: number): React.ReactNode => {
  if (count >= 1000) return <Trophy className="w-5 h-5" />;
  if (count >= 500) return <Gem className="w-5 h-5" />;
  if (count >= 250) return <Flame className="w-5 h-5" />;
  if (count >= 100) return <Star className="w-5 h-5" />;
  if (count >= 50) return <Star className="w-5 h-5" />;
  if (count >= 25) return <Target className="w-5 h-5" />;
  if (count >= 10) return <Zap className="w-5 h-5" />;
  if (count >= 5) return <Sparkles className="w-5 h-5" />;
  return <Gift className="w-5 h-5" />;
};

const getMilestoneTitle = (count: number): string => {
  if (count >= 1000) return 'Legendary Referrer!';
  if (count >= 500) return 'Diamond Status!';
  if (count >= 250) return 'On Fire!';
  if (count >= 100) return 'Century Club!';
  if (count >= 50) return 'Half Century!';
  if (count >= 25) return 'Quarter Century!';
  if (count >= 10) return 'Double Digits!';
  if (count >= 5) return 'High Five!';
  return 'New Referral!';
};

export const ReferralSuccessToast: React.FC<ReferralSuccessToastProps> = ({
  t,
  refereeName,
  refereeAvatar,
  milestoneCount,
}) => {
  const isMilestone = milestoneCount && MILESTONES.includes(milestoneCount);
  const icon = milestoneCount ? getMilestoneIcon(milestoneCount) : <Gift className="w-5 h-5" />;
  const title = milestoneCount ? getMilestoneTitle(milestoneCount) : 'New Referral!';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'max-w-sm w-full rounded-2xl shadow-2xl overflow-hidden relative',
        isMilestone
          ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600'
          : 'bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600'
      )}
    >
      {/* Confetti particles for milestones */}
      {isMilestone && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(25)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${4 + Math.random() * 6}px`,
                height: `${4 + Math.random() * 6}px`,
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFFFFF'][i % 5],
              }}
              initial={{ top: '-10%', opacity: 1, rotate: 0 }}
              animate={{ 
                top: '120%', 
                opacity: [1, 1, 0],
                rotate: Math.random() * 720 - 360,
                x: (Math.random() - 0.5) * 100,
              }}
              transition={{
                duration: 2 + Math.random() * 1.5,
                delay: Math.random() * 0.8,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative p-4">
        {/* Close button */}
        <button
          onClick={() => toast.dismiss(t.id)}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-start gap-3 pr-8">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <motion.div 
              className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              animate={isMilestone ? { 
                scale: [1, 1.1, 1],
                rotate: [0, -5, 5, 0],
              } : {}}
              transition={{ duration: 0.6, repeat: isMilestone ? Infinity : 0, repeatDelay: 1 }}
            >
              {isMilestone ? (
                <Crown className="w-6 h-6 text-white" />
              ) : (
                <Gift className="w-6 h-6 text-white" />
              )}
            </motion.div>
            
            {/* Sparkle effect */}
            {isMilestone && (
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ 
                  rotate: [0, 180, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white">{icon}</span>
              <h4 className="font-bold text-white text-sm">
                {title}
              </h4>
              {milestoneCount && (
                <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-full text-white">
                  {milestoneCount} total
                </span>
              )}
            </div>
            
            <p className="text-sm text-white/90">
              <span className="font-semibold">{refereeName}</span>
              {' '}just joined through your link!
            </p>
            
            {isMilestone && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-white/80 mt-1.5 flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5" />
                You're crushing it! Keep sharing.
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar for visual polish */}
      <motion.div
        className="h-1 bg-white/30"
        initial={{ scaleX: 1, transformOrigin: 'left' }}
        animate={{ scaleX: 0 }}
        transition={{ 
          duration: isMilestone ? 6 : 4, 
          ease: 'linear' 
        }}
      />
    </motion.div>
  );
};

/**
 * Show referral success toast
 * 
 * @param refereeName - Name of the person who joined
 * @param refereeAvatar - Optional avatar URL
 * @param milestoneCount - If this is a milestone (5, 10, 25, 50, 100), pass the count
 */
export const showReferralSuccessToast = (
  refereeName: string,
  refereeAvatar?: string,
  milestoneCount?: number
): string => {
  const isMilestone = milestoneCount && MILESTONES.includes(milestoneCount);
  
  return toast.custom(
    (t) => (
      <ReferralSuccessToast
        t={t}
        refereeName={refereeName}
        refereeAvatar={refereeAvatar}
        milestoneCount={milestoneCount}
      />
    ),
    {
      duration: isMilestone ? 6000 : 4000,
      position: 'top-center',
    }
  );
};

/**
 * ReferralMilestoneModal
 * 
 * Full-screen celebration for major milestones.
 * Use for 100+ referrals or special achievements.
 */
interface ReferralMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneCount: number;
  userName: string;
}

export const ReferralMilestoneModal: React.FC<ReferralMilestoneModalProps> = ({
  isOpen,
  onClose,
  milestoneCount,
  userName,
}) => {
  const icon = getMilestoneIcon(milestoneCount);
  const title = getMilestoneTitle(milestoneCount);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
              {/* Confetti background */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      width: `${4 + Math.random() * 8}px`,
                      height: `${4 + Math.random() * 8}px`,
                      backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#FFFFFF'][i % 5],
                    }}
                    initial={{ top: '-10%', opacity: 1 }}
                    animate={{ 
                      top: '110%', 
                      opacity: [1, 1, 0],
                      rotate: Math.random() * 720,
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      delay: Math.random(),
                      repeat: Infinity,
                      repeatDelay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <div className="relative z-10">
                <motion.div
                  className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 text-white"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, -10, 10, 0],
                  }}
                  transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
                >
                  <Trophy className="w-10 h-10" />
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-2">
                  {title}
                </h2>

                <p className="text-white/90 text-lg mb-2">
                  You've referred <span className="font-bold">{milestoneCount}</span> people!
                </p>

                <p className="text-white/80 text-sm mb-6">
                  Thanks for growing the FanClubZ community, {userName}!
                </p>

                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-white text-amber-600 rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2 mx-auto"
                >
                  <Zap className="w-4 h-4" />
                  Keep Going!
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ReferralSuccessToast;
