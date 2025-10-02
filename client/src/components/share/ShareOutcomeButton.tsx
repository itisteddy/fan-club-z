import React, { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { useShareResult } from './useShareResult';
import type { ShareOutcomeProps } from './ShareOutcomeCard';
import { formatCurrency } from '@lib/format';

interface ShareOutcomeButtonProps extends ShareOutcomeProps {
  className?: string;
  children?: React.ReactNode;
  onShare?: () => void;
}

/**
 * Button component that handles sharing prediction outcomes
 */
export function ShareOutcomeButton({
  title,
  choice,
  stake,
  payout,
  result,
  creatorName,
  user,
  deeplink,
  className = '',
  children,
  onShare
}: ShareOutcomeButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { SharePreview, share } = useShareResult();

  const handleShare = async () => {
    if (isSharing) return;
    
    setIsSharing(true);
    onShare?.();

    try {
      const shareUrl = window.location.href;
      const shareText = `I ${result === 'won' ? 'won' : result === 'lost' ? 'lost' : 'participated in'} ${formatCurrency(Math.abs(payout - stake), { compact: true })} on "${title}". Try it → ${deeplink || 'app.fanclubz.app'}`;

      await share({
        title: `My FanClubZ ${result}`,
        text: shareText,
        url: shareUrl
      });
    } catch (error) {
      console.error('Error sharing outcome:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      {/* Hidden preview component */}
      <SharePreview
        title={title}
        choice={choice}
        stake={stake}
        payout={payout}
        result={result}
        creatorName={creatorName}
        user={user}
        deeplink={deeplink}
      />

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={isSharing}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-xl
          bg-emerald-600 text-white font-medium
          hover:bg-emerald-700 active:bg-emerald-800
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
          ${className}
        `}
      >
        {isSharing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Share2 className="w-4 h-4" />
        )}
        {children || (isSharing ? 'Sharing...' : 'Share Result')}
      </button>
    </>
  );
}

export default ShareOutcomeButton;
