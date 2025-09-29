import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Prediction, PredictionEntry } from '../store/predictionStore';
import { useLikeStore } from '../store/likeStore';
import { useUnifiedCommentStore } from '../store/unifiedCommentStore';
import CommentModal from './modals/CommentModal';
import ErrorBoundary from './ErrorBoundary';
import toast from 'react-hot-toast';
import { formatCurrencyShort, formatNumberCompact, formatTimeUntil } from '../utils/formatters';
import ImageThumb from './ui/ImageThumb';

interface PredictionCardProps {
  prediction: Prediction;
  entry?: PredictionEntry;
  variant?: 'default' | 'compact' | 'user-entry';
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  className?: string;
}

// Safe error fallback for individual prediction cards
const PredictionCardErrorFallback: React.FC<{ error?: string }> = ({ error }) => (
  <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 m-2">
    <div className="text-red-600 text-sm">
      ⚠️ Error loading prediction
      {error && <div className="text-xs mt-1 text-gray-500">{error}</div>}
    </div>
  </div>
);

const PredictionCardContent: React.FC<PredictionCardProps> = ({
  prediction,
  entry,
  variant = 'default',
  onLike: customOnLike,
  onComment: customOnComment,
  onShare: customOnShare,
  className = ''
}) => {
  // Early return with error boundary if prediction is invalid
  if (!prediction || !prediction.id) {
    console.warn('⚠️ PredictionCard: Invalid prediction data received:', prediction);
    return <PredictionCardErrorFallback error="Invalid prediction data" />;
  }

  const navigate = useNavigate();
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  // Get stores
  const { likes, toggleLike } = useLikeStore();
  const { getCommentCount } = useUnifiedCommentStore();

  // Calculate real data with safe fallbacks
  const entryDeadline = prediction.entry_deadline || prediction.entryDeadline;
  
  // Use real participant count from database with fallbacks
  const participantCount = prediction.participant_count || prediction.entries?.length || 0;

  // Calculate total pool from options or use fallback
  const totalPool = prediction.options?.reduce((sum, option) => {
    const staked = option.total_staked || option.totalStaked || 0;
    return sum + staked;
  }, 0) || prediction.pool_total || prediction.poolTotal || 0;

  // Get like and comment counts
  const likeCount = likes[prediction.id] || 0;
  const commentCount = getCommentCount(prediction.id);
  const isLiked = false; // Simplified for now

  // Get first two options for chips
  const chips = (prediction.options || []).slice(0, 2).map((option) => ({
    label: option.text || option.option || option.label || 'Option',
    odds: option.current_odds || option.odds || 1,
  }));

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLiking) return;
    setIsLiking(true);

    try {
      await toggleLike(prediction.id);
      if (customOnLike) customOnLike();
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      toast.error('Failed to update like');
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCommentModalOpen(true);
    if (customOnComment) customOnComment();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const shareData = {
        title: prediction.question || prediction.title,
        text: `Check out this prediction: ${prediction.question || prediction.title}`,
        url: `${window.location.origin}/prediction/${prediction.id}`
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareData.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link copied to clipboard!');
      }
      
      if (customOnShare) customOnShare();
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share');
    }
  };

  return (
    <>
      <article
        className={`group relative rounded-2xl border border-black/5 bg-white p-4 md:p-5 shadow-none hover:shadow-sm transition-shadow ${className}`}
        data-qa="prediction-card"
      >
        <div className="grid grid-cols-[1fr,auto] gap-4">
          {/* LEFT: content */}
          <Link to={`/prediction/${prediction.id}`} className="min-w-0">
            <div className="flex items-start gap-2 text-xs text-slate-500">
              {prediction.category && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  {prediction.category}
                </span>
              )}
              {entryDeadline && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5">
                  ends in {formatTimeUntil(entryDeadline)}
                </span>
              )}
            </div>

            <h3 className="mt-2 line-clamp-2 text-base md:text-lg font-semibold text-slate-900">
              {prediction.question || prediction.title}
            </h3>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>{formatCurrencyShort(totalPool)}</span>
              <span>•</span>
              <span>{formatNumberCompact(participantCount)} {participantCount === 1 ? 'player' : 'players'}</span>
            </div>

            {chips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {chips.map((c, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-700"
                  >
                    {c.label} <span className="ml-1 font-semibold text-slate-900">{c.odds.toFixed(2)}x</span>
                  </span>
                ))}
              </div>
            )}

            {/* engagement row — subtle, not shouty */}
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <button
                onClick={handleLike}
                className="inline-flex items-center gap-1 hover:text-red-500 transition-colors"
              >
                <Heart className="h-3.5 w-3.5" />
                {formatNumberCompact(likeCount)}
              </button>
              <button
                onClick={handleComment}
                className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {formatNumberCompact(commentCount)}
              </button>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1 hover:text-emerald-500 transition-colors"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
          </Link>

          {/* RIGHT: thumbnail */}
          <ImageThumb
            seed={prediction.id}
            size={96} // tweak to 88 on xs if desired via responsive classes
            alt={prediction.question || prediction.title}
            className="mt-1"
          />
        </div>

        {/* No big button. Whole card is the CTA via Link. */}
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-0 ring-inset transition group-hover:ring-1 group-hover:ring-slate-200" />
      </article>

      {/* Comment Modal */}
      <CommentModal
        prediction={prediction}
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
      />
    </>
  );
};

// Main component wrapped in error boundary
const PredictionCard: React.FC<PredictionCardProps> = (props) => {
  return (
    <ErrorBoundary>
      <PredictionCardContent {...props} />
    </ErrorBoundary>
  );
};

export default PredictionCard;