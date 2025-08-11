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
import { Card, CardContent } from '../ui/card';
import { scrollToTop } from '../../utils/scroll';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Prediction } from '../../store/predictionStore';
import { formatCurrency, formatTimeRemaining, generateInitials, getAvatarUrl, cn } from '../../lib/utils';
import { PlacePredictionModal } from './PlacePredictionModal';
import { CommentsModal } from './CommentsModal';
import { useLikeStore } from '../../store/likeStore';

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
    setLocation(`/prediction/${prediction.id}`);
    // Scroll to top when navigating to prediction detail
    scrollToTop({ behavior: 'instant' });
  };

  const handleQuickBet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/prediction/${prediction.id}`;
    const shareText = `${prediction.title}\n\nMake your prediction on Fan Club Z!`;

    // Mobile-first: Try native share API first
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      navigator.share({
        title: prediction.title,
        text: shareText,
        url: shareUrl,
      }).catch((error) => {
        // Only fallback if it's not a user cancellation
        if (error.name !== 'AbortError') {
          copyToClipboard(shareUrl, shareText);
        }
      });
    } else {
      // Desktop or fallback: Copy to clipboard
      copyToClipboard(shareUrl, shareText);
    }
  };

  const copyToClipboard = (shareUrl: string, shareText: string) => {
    const fullText = `${shareText}\n\n${shareUrl}`;
    
    navigator.clipboard.writeText(fullText)
      .then(() => {
        // Show mobile-friendly success notification
        showShareNotification('Link copied to clipboard! 📋', 'success');
      })
      .catch(() => {
        // Final fallback for older browsers
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
    
    // Add CSS animation
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
        <Card 
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 h-24"
          onClick={handleCardClick}
        >
          <CardContent className="p-3">
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
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (variant === 'user-entry') {
    const userEntry = prediction.user_entry;
    const isWon = prediction.status === 'settled' && userEntry;
    
    return (
      <Card className={cn(
        "border-l-4",
        isWon ? "border-l-green-500 bg-green-50/50" : 
        prediction.status === 'settled' ? "border-l-red-500 bg-red-50/50" :
        "border-l-primary bg-primary/5"
      )}>
        <CardContent className="p-3">
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
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="prediction-card-compact prediction-card"
      >
        <Card 
          className="cursor-pointer overflow-hidden hover:shadow-md transition-shadow"
          onClick={handleCardClick}
        >
          <CardContent className="p-2.5">
            {/* Header - More compact */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <div 
                  className="avatar-clickable cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Navigating to creator profile via avatar:', prediction.creator.id);
                    // Navigate to creator profile
                    setLocation(`/profile/${prediction.creator.id}`);
                  }}
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={getAvatarUrl(prediction.creator)} />
                    <AvatarFallback className="text-xs">
                      {generateInitials(prediction.creator.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div 
                  className="creator-profile-link cursor-pointer hover:text-primary transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Navigating to creator profile:', prediction.creator.id);
                    // Navigate to creator profile
                    setLocation(`/profile/${prediction.creator.id}`);
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium">{prediction.creator.username}</span>
                    {prediction.creator.is_verified && (
                      <CheckCircle size={8} className="text-primary" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-xs bg-primary/10 text-primary px-1 py-0.5 rounded-full">
                {categoryEmojis[prediction.category]}
              </div>
            </div>

            {/* Content - More compact */}
            <div onClick={handleCardClick}>
              <h3 className="font-semibold text-sm mb-1 leading-tight line-clamp-2">
                {prediction.title}
              </h3>
              {prediction.description && (
                <p className="text-muted-foreground text-xs mb-1 line-clamp-1">
                  {prediction.description}
                </p>
              )}
            </div>

            {/* Options - Show all options with smart layout */}
            <div className="mb-1">
              {prediction.options.length <= 2 ? (
                // For 1-2 options, use 2-column grid
                <div className="grid grid-cols-2 gap-0.5">
                  {prediction.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBet(e);
                      }}
                      className="bg-muted/50 rounded p-1 text-center hover:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-medium mb-0.5 line-clamp-1 leading-tight">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.percentage.toFixed(0)}% • {option.current_odds.toFixed(1)}x
                      </div>
                    </button>
                  ))}
                </div>
              ) : prediction.options.length <= 4 ? (
                // For 3-4 options, use 2x2 grid
                <div className="grid grid-cols-2 gap-0.5">
                  {prediction.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBet(e);
                      }}
                      className="bg-muted/50 rounded p-1 text-center hover:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-medium mb-0.5 line-clamp-1 leading-tight">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.percentage.toFixed(0)}% • {option.current_odds.toFixed(1)}x
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                // For 5+ options, show first 3 with "+X more" indicator
                <div className="space-y-0.5">
                                  <div className="grid grid-cols-3 gap-0.5">
                  {prediction.options.slice(0, 3).map((option) => (
                    <button
                      key={option.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickBet(e);
                      }}
                      className="bg-muted/50 rounded p-1 text-center hover:bg-muted/70 transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-medium mb-0.5 line-clamp-1 leading-tight">{option.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.percentage.toFixed(0)}% • {option.current_odds.toFixed(1)}x
                      </div>
                    </button>
                  ))}
                </div>
                  {prediction.options.length > 3 && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-0.5">
                        +{prediction.options.length - 3} more options
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats - More compact */}
            <div className="py-1 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <Zap size={9} />
                    {formatCurrency(prediction.pool_total)}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users size={9} />
                    {prediction.participant_count}
                  </div>
                  <div className={cn("flex items-center gap-1", getTimeColor())}>
                    <Clock size={9} />
                    <span className="text-xs">{formatTimeRemaining(prediction.entry_deadline)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions - More compact */}
            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await toggleLike(prediction.id);
                    } catch (error) {
                      console.error('Failed to toggle like:', error);
                    }
                  }}
                  className={cn(
                    "text-muted-foreground hover:text-primary h-5 px-1",
                    isLiked && "text-red-500 hover:text-red-600"
                  )}
                >
                  <Heart size={10} className={cn(isLiked && "fill-current")} />
                  <span className="ml-1 text-xs">{prediction.likes_count || 0}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCommentsModal(true);
                  }}
                  className="text-muted-foreground hover:text-primary h-5 px-1"
                >
                  <MessageCircle size={10} />
                  <span className="ml-1 text-xs">{prediction.comments_count || 0}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="text-muted-foreground hover:text-primary h-5 px-1"
                >
                  <Share2 size={10} />
                </Button>
              </div>

              <Button 
                size="sm"
                onClick={handleQuickBet}
                className="h-6 px-3 text-xs"
              >
                Predict
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <PlacePredictionModal
        prediction={prediction}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
      
      <CommentsModal
        predictionId={prediction.id}
        predictionTitle={prediction.title}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
      />
    </>
  );
};