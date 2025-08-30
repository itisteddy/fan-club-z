import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { scrollToTop } from '../../utils/scroll';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Prediction } from '../../store/predictionStore';
import { formatCurrency, formatTimeRemaining, generateInitials, getAvatarUrl, cn } from '../../lib/utils';
import { PlacePredictionModal } from './PlacePredictionModal';
import { CommentsModal } from './CommentsModal';
import { useLikeStore } from '../../store/likeStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface PredictionCardProps {
  prediction: Prediction;
  variant?: 'default' | 'horizontal' | 'user-entry';
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ 
  prediction, 
  variant = 'default' 
}) => {
  const [, setLocation] = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const { toggleLike, checkIfLiked } = useLikeStore();
  const { isAuthenticated } = useAuthStore();
  const isLiked = checkIfLiked(prediction.id);

  const categoryEmojis = {
    sports: '⚽',
    pop_culture: '🎭',
    politics: '🗳️',
    esports: '🎮',
    celebrity_gossip: '⭐',
    custom: '🔮'
  };

  const getTimeColor = () => {
    const deadline = new Date(prediction.entry_deadline);
    const now = new Date();
    const hoursLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursLeft < 1) return 'text-red-500';
    if (hoursLeft < 24) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const handleCardClick = () => {
    console.log('🎯 Prediction card clicked, navigating to:', `/prediction/${prediction.id}`);
    setLocation(`/prediction/${prediction.id}`);
    scrollToTop({ behavior: 'instant' });
  };

  const handleQuickBet = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please log in to place predictions');
      setLocation('/auth');
      return;
    }
    
    setShowModal(true);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/prediction/${prediction.id}`;
    const shareText = `${prediction.title}\n\nMake your prediction on Fan Club Z!`;

    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.share({
        title: prediction.title,
        text: shareText,
        url: shareUrl,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          copyToClipboard(shareUrl, shareText);
        }
      });
    } else {
      copyToClipboard(shareUrl, shareText);
    }
  };

  const copyToClipboard = (shareUrl: string, shareText: string) => {
    const fullText = `${shareText}\n\n${shareUrl}`;
    
    navigator.clipboard.writeText(fullText)
      .then(() => {
        showShareNotification('Link copied to clipboard! 📋', 'success');
      })
      .catch(() => {
        showShareNotification(`Share this link: ${shareUrl}`, 'info');
      });
  };

  const showShareNotification = (message: string, type: 'success' | 'info') => {
    const notification = document.createElement('div');
    const isSuccess = type === 'success';
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 20px;
      background-color: ${isSuccess ? '#10b981' : '#3b82f6'};
      color: white;
      border-radius: 12px;
      font-weight: 500;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 90vw;
      text-align: center;
      animation: slideInDown 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInDown {
        from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 3000);
  };

  if (variant === 'horizontal') {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="shrink-0 w-36"
      >
        <div 
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-xl h-24 p-3"
          onClick={handleCardClick}
        >
          <div className="text-xs font-medium text-primary mb-1">
            {categoryEmojis[prediction.category]}
          </div>
          <h3 className="font-semibold text-xs leading-tight mb-2 line-clamp-2">
            {prediction.title}
          </h3>
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-primary">
              {formatCurrency(prediction.pool_total)}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={10} />
              {prediction.participant_count}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === 'user-entry') {
    const userEntry = prediction.user_entry;
    const isWon = prediction.status === 'settled' && userEntry;
    
    return (
      <div className={cn(
        "border border-l-4 rounded-xl p-3 bg-white",
        isWon ? "border-l-green-500 bg-green-50/50" : 
        prediction.status === 'settled' ? "border-l-red-500 bg-red-50/50" :
        "border-l-primary bg-primary/5"
      )}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1 cursor-pointer hover:text-primary line-clamp-2" onClick={handleCardClick}>
              {prediction.title}
            </h3>
            <div className="text-xs text-muted-foreground">
              Your position: Option {userEntry?.option_id}
            </div>
          </div>
          <div className="text-right">
            {prediction.status === 'settled' ? (
              <span className={cn(
                "text-xs font-medium",
                isWon ? "text-green-600" : "text-red-600"
              )}>
                {isWon ? "Won" : "Lost"}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Active</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-muted-foreground">Invested</div>
            <div className="font-semibold">
              {formatCurrency(userEntry?.amount || 0)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {prediction.status === 'settled' ? 'Final Return' : 'Potential Return'}
            </div>
            <div className={cn(
              "font-semibold",
              prediction.status === 'settled' 
                ? isWon ? "text-green-600" : "text-red-600"
                : "text-primary"
            )}>
              {formatCurrency(userEntry?.potential_payout || 0)}
            </div>
          </div>
        </div>

        {prediction.status !== 'settled' && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={getTimeColor()}>
                <Clock size={10} className="inline mr-1" />
                {formatTimeRemaining(prediction.entry_deadline)}
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleQuickBet}
                className="text-xs h-6 px-2"
              >
                Add More
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main prediction card - completely redesigned
  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="prediction-card"
      >
        <div 
          className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
          onClick={handleCardClick}
        >
          {/* Header Section */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getAvatarUrl(prediction.creator)} />
                  <AvatarFallback className="text-xs">
                    {generateInitials(prediction.creator.username)}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('👤 Navigating to creator profile:', prediction.creator.id);
                    setLocation(`/profile/${prediction.creator.id}`);
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
                >
                  <span className="font-medium text-sm text-gray-900">
                    {prediction.creator.username}
                  </span>
                  {prediction.creator.is_verified && (
                    <CheckCircle size={12} className="text-primary" />
                  )}
                </button>
              </div>
              <div className="text-lg">
                {categoryEmojis[prediction.category]}
              </div>
            </div>

            {/* Prediction Question */}
            <h3 className="font-semibold text-gray-900 text-base leading-tight mb-2 line-clamp-2">
              {prediction.title}
            </h3>
            
            {/* Prediction Description */}
            {prediction.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {prediction.description}
              </p>
            )}
          </div>

          {/* Options Section - No more nested cards */}
          <div className="px-4 pb-3">
            <div className="grid grid-cols-2 gap-2">
              {prediction.options?.map((option, index) => (
                <button
                  key={option.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickBet(e);
                  }}
                  className="bg-gray-50 hover:bg-gray-100 rounded-lg p-3 transition-colors text-left"
                >
                  <div className="font-medium text-sm text-gray-900 mb-1">
                    {option.label}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {option.percentage}%
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {option.current_odds?.toFixed(1)}x
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Stats Section */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Zap size={12} />
                  <span>{formatCurrency(prediction.pool_total)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  <span>{prediction.participant_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  <span className={getTimeColor()}>
                    {formatTimeRemaining(prediction.entry_deadline)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      toast.error('Please log in to like predictions');
                      setLocation('/auth');
                      return;
                    }
                    toggleLike(prediction.id);
                  }}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
                  }`}
                >
                  <Heart size={14} className={isLiked ? 'fill-current' : ''} />
                  <span>{prediction.likes_count || 0}</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAuthenticated) {
                      toast.error('Please log in to comment');
                      setLocation('/auth');
                      return;
                    }
                    setShowCommentsModal(true);
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
                >
                  <MessageCircle size={14} />
                  <span>{prediction.comments_count || 0}</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary transition-colors"
                >
                  <Share2 size={14} />
                </button>
              </div>
              
              <Button
                onClick={handleQuickBet}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Predict
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      {showModal && (
        <PlacePredictionModal
          prediction={prediction}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}

             {showCommentsModal && (
         <CommentsModal
           predictionId={prediction.id}
           predictionTitle={prediction.title}
           isOpen={showCommentsModal}
           onClose={() => setShowCommentsModal(false)}
         />
       )}
    </>
  );
};