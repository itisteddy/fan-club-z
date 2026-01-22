import React from 'react';
import { ArrowLeft, Share2, MoreHorizontal, Clock, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { prefersReducedMotion } from '../../utils/accessibility';
import UnifiedHeader from '../layout/UnifiedHeader';
import { getPredictionStatusUi } from '@/lib/predictionStatusUi';

interface PredictionDetailsHeaderProps {
  title: string;
  creator: {
    id: string;
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  totalVolume: string;
  participantCount: number;
  expiresAt: string;
  status: string;
  settledAt?: string | null;
  closedAt?: string | null;
  onBack: () => void;
  onShare: () => void;
  onMoreOptions?: () => void;
}

const PredictionDetailsHeader: React.FC<PredictionDetailsHeaderProps> = ({
  title,
  creator,
  totalVolume,
  participantCount,
  expiresAt,
  status,
  settledAt,
  closedAt,
  onBack,
  onShare,
  onMoreOptions
}) => {
  const getTimeRemaining = () => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Use canonical status UI helper
  const statusUi = getPredictionStatusUi({
    status,
    settledAt,
    closedAt,
    closesAt: expiresAt,
  });

  const getStatusColor = () => {
    switch (statusUi.tone) {
      case 'success': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'danger': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const actions = [
    {
      id: 'share',
      icon: Share2,
      label: 'Share prediction',
      onClick: onShare
    }
  ];

  if (onMoreOptions) {
    actions.push({
      id: 'more',
      icon: MoreHorizontal,
      label: 'More options',
      onClick: onMoreOptions
    });
  }

  return (
    <div>
      <UnifiedHeader
        title={title}
        subtitle={`By ${creator.full_name || creator.username}`}
        showLogo={false}
        showBack={true}
        onBack={onBack}
        actions={actions}
      />
      
      {/* Prediction Header Content */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
            <div className="w-2 h-2 bg-current rounded-full mr-2" />
            {statusUi.label}
            {statusUi.subtext && (
              <span className="ml-2 text-xs opacity-75">{statusUi.subtext}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{getTimeRemaining()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>{participantCount}</span>
            </div>
          </div>
        </div>

        {/* Creator & Volume */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.full_name || creator.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  {(creator.full_name || creator.username).charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {creator.full_name || creator.username}
              </p>
              <p className="text-xs text-gray-500">
                @{creator.username}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Volume</p>
            <p className="text-lg font-bold text-gray-900">
              ${totalVolume}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionDetailsHeader;
