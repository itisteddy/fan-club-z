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
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Prediction } from '../../stores/predictionStore';
import { formatCurrency, formatTimeRemaining, generateInitials, getAvatarUrl, cn } from '../../lib/utils';
import { PlacePredictionModal } from './PlacePredictionModal';

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
  const [isLiked, setIsLiked] = useState(false);

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
  };

  const handleQuickBet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
  };

  if (variant === 'horizontal') {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        className="shrink-0 w-40"
      >
        <Card 
          className="cursor-pointer overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20"
          onClick={handleCardClick}
        >
          <CardContent className="p-4">
            <div className="text-xs font-medium text-primary mb-2">
              {categoryEmojis[prediction.category]} {prediction.category.replace('_', ' ')}
            </div>
            <h3 className="font-semibold text-sm leading-tight mb-3">
              {prediction.title}
            </h3>
            <div className="space-y-2">
              <div className="text-xl font-bold text-primary">
                {formatCurrency(prediction.pool_total)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users size={12} />
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
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold mb-1 cursor-pointer hover:text-primary" onClick={handleCardClick}>
                {prediction.title}
              </h3>
              <div className="text-sm text-muted-foreground">
                Your position: Option {userEntry?.option_id}
              </div>
            </div>
            <div className="text-right">
              {prediction.status === 'settled' ? (
                <span className={cn(
                  "text-sm font-medium",
                  isWon ? "text-green-600" : "text-red-600"
                )}>
                  {isWon ? "Won" : "Lost"}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Active</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
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
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className={getTimeColor()}>
                  <Clock size={12} className="inline mr-1" />
                  {formatTimeRemaining(prediction.entry_deadline)}
                </span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleQuickBet}
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
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <Card className="cursor-pointer overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            {/* Header */}
            <div className="p-4 pb-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={getAvatarUrl(prediction.creator)} />
                    <AvatarFallback className="text-xs">
                      {generateInitials(prediction.creator.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{prediction.creator.username}</span>
                      {prediction.creator.is_verified && (
                        <CheckCircle size={14} className="text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimeRemaining(prediction.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {categoryEmojis[prediction.category]} {prediction.category.replace('_', ' ')}
                </div>
              </div>

              {/* Content */}
              <div onClick={handleCardClick}>
                <h3 className="font-semibold text-lg mb-2 leading-tight">
                  {prediction.title}
                </h3>
                {prediction.description && (
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {prediction.description}
                  </p>
                )}
              </div>
            </div>

            {/* Options */}
            <div className="px-4 mb-4">
              <div className="grid grid-cols-2 gap-2">
                {prediction.options.slice(0, 2).map((option) => (
                  <div
                    key={option.id}
                    className="bg-muted/50 rounded-lg p-3 text-center"
                  >
                    <div className="text-sm font-medium mb-1">{option.label}</div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {option.percentage.toFixed(1)}%
                    </div>
                    <div className="text-lg font-bold text-primary">
                      {option.current_odds.toFixed(2)}x
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="px-4 py-3 bg-muted/30 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-primary font-semibold">
                    <Zap size={14} />
                    {formatCurrency(prediction.pool_total)}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users size={14} />
                    {prediction.participant_count}
                  </div>
                  <div className={cn("flex items-center gap-1", getTimeColor())}>
                    <Clock size={14} />
                    {formatTimeRemaining(prediction.entry_deadline)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLiked(!isLiked);
                  }}
                  className={cn(
                    "text-muted-foreground hover:text-primary",
                    isLiked && "text-red-500 hover:text-red-600"
                  )}
                >
                  <Heart size={16} className={cn(isLiked && "fill-current")} />
                  <span className="ml-1">24</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/prediction/${prediction.id}#comments`);
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <MessageCircle size={16} />
                  <span className="ml-1">12</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle share
                  }}
                  className="text-muted-foreground hover:text-primary"
                >
                  <Share2 size={16} />
                </Button>
              </div>

              <Button 
                size="sm"
                onClick={handleQuickBet}
                className="px-6"
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
    </>
  );
};
