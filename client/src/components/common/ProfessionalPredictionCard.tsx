import React from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, Users, MessageCircle, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import EnhancedUserAvatar from './EnhancedUserAvatar';

interface ProfessionalPredictionCardProps {
  id: string;
  title: string;
  description?: string;
  category: string;
  creator: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  volume: number;
  participants: number;
  commentsCount: number;
  isActive: boolean;
  endDate: string;
  createdAt: string;
  odds?: {
    yes: number;
    no: number;
  };
  userPosition?: {
    side: 'yes' | 'no';
    amount: number;
    potential: number;
  };
  onClick?: () => void;
  onShare?: () => void;
  className?: string;
}

const categoryColors: Record<string, string> = {
  sports: 'bg-blue-50 text-blue-700 border-blue-200',
  politics: 'bg-purple-50 text-purple-700 border-purple-200',
  entertainment: 'bg-pink-50 text-pink-700 border-pink-200',
  crypto: 'bg-orange-50 text-orange-700 border-orange-200',
  business: 'bg-green-50 text-green-700 border-green-200',
  science: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  custom: 'bg-gray-50 text-gray-700 border-gray-200',
};

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

const formatPercentage = (value: number): string => {
  return `${Math.round(value)}¢`;
};

export const ProfessionalPredictionCard: React.FC<ProfessionalPredictionCardProps> = ({
  id,
  title,
  description,
  category,
  creator,
  volume,
  participants,
  commentsCount,
  isActive,
  endDate,
  createdAt,
  odds,
  userPosition,
  onClick,
  onShare,
  className = ''
}) => {
  const timeRemaining = formatDistanceToNow(new Date(endDate), { addSuffix: true });
  const categoryStyle = categoryColors[category] || categoryColors.custom;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`fc-market-card cursor-pointer ${className}`}
      onClick={onClick}
    >
      {/* Header */}
              <div className="fc-flex-between fc-mb-4">
        <div className="flex items-center gap-3">
          <span className={`fc-status px-2 py-1 rounded-md text-xs font-medium border ${categoryStyle}`}>
            {category}
          </span>
          <span className={`fc-status ${isActive ? 'fc-status-active' : 'fc-status-closed'}`}>
            {isActive ? 'Active' : 'Closed'}
          </span>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare?.();
          }}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          title="Share prediction"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Title */}
      <h3 className="fc-text-lg fc-font-semibold text-gray-900 fc-mb-2 line-clamp-2 leading-tight">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="fc-text-sm text-gray-600 fc-mb-4 line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      {/* Market Data - Trading-style Layout */}
      {odds && (
        <div className="fc-grid fc-grid-2 fc-mb-4 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="fc-text-sm font-medium text-green-800">YES</span>
              <span className="fc-price-display text-green-700">
                {formatPercentage(odds.yes)}
              </span>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="fc-text-sm font-medium text-red-800">NO</span>
              <span className="fc-price-display text-red-700">
                {formatPercentage(odds.no)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* User Position */}
      {userPosition && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 fc-mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="fc-text-xs font-medium text-blue-800 uppercase">
                Your Position
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                userPosition.side === 'yes' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {userPosition.side.toUpperCase()}
              </span>
            </div>
            <div className="text-right">
              <div className="fc-text-sm font-semibold text-gray-900">
                {formatCurrency(userPosition.potential)}
              </div>
              <div className="fc-text-xs text-gray-600">
                {formatCurrency(userPosition.amount)} risked
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex items-center justify-between fc-mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <TrendingUp size={14} className="text-gray-400" />
            <span className="font-medium">{formatCurrency(volume)}</span>
            <span className="text-gray-400">volume</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} className="text-gray-400" />
            <span className="font-medium">{participants}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle size={14} className="text-gray-400" />
            <span className="font-medium">{commentsCount}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 text-gray-500">
          <Clock size={14} />
          <span className="fc-text-xs">
            {isActive ? `Ends ${timeRemaining}` : 'Ended'}
          </span>
        </div>
      </div>

      {/* Creator Info */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <EnhancedUserAvatar
            username={creator.username}
            fullName={creator.fullName}
            avatarUrl={creator.avatarUrl}
            isVerified={creator.isVerified}
            size="sm"
          />
          <div>
            <div className="fc-text-sm font-medium text-gray-900">
              {creator.fullName || creator.username}
            </div>
            <div className="fc-text-xs text-gray-500">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(ProfessionalPredictionCard);
