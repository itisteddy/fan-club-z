import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  DollarSign, 
  Heart, 
  TrendingUp, 
  Clock, 
  User,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useActivityFeed, ActivityItem } from '../../hooks/useActivityFeed';
import { formatCurrency, formatTimeAgo } from '@/lib/format';
import { t } from '@/lib/lexicon';

interface ActivityFeedProps {
  predictionId: string;
  className?: string;
}

interface ActivityItemComponentProps {
  item: ActivityItem;
}

/**
 * Individual activity item component
 */
function ActivityItemComponent({ item }: ActivityItemComponentProps) {
  const getActivityIcon = (type: string) => {
    if (type.startsWith('comment')) return MessageCircle;
    if (type.startsWith('entry')) return DollarSign;
    if (type.startsWith('reaction')) return Heart;
    if (type.startsWith('prediction')) return TrendingUp;
    return Clock;
  };

  const getActivityMessage = (item: ActivityItem) => {
    const { type, actor, data } = item;
    const actorName = actor?.full_name || actor?.username || 'Anonymous';
    
    switch (type) {
      case 'comment':
        return {
          message: `${actorName} commented`,
          details: data.content ? data.content.substring(0, 100) + (data.content.length > 100 ? '...' : '') : '',
          icon: MessageCircle
        };
      
      case 'entry.create':
        return {
          message: `${actorName} locked a ${t('bet')}`,
          details: `${formatCurrency(data.amount, { compact: true })}${data.option_label ? ` on ${data.option_label}` : ''}`,
          icon: DollarSign
        };
      
      case 'reaction.like':
        return {
          message: `${actorName} liked this prediction`,
          details: '',
          icon: Heart
        };
      
      case 'prediction.open':
        return {
          message: `Prediction is now open for ${t('betting')}`,
          details: '',
          icon: TrendingUp
        };
      
      case 'prediction.settled':
        return {
          message: 'Prediction has been settled',
          details: data.settled_outcome_id ? 'Outcome determined' : '',
          icon: TrendingUp
        };
      case 'wallet.unlock':
        return {
          message: 'Escrow funds released',
          details: data.amount ? formatCurrency(data.amount, { compact: true }) : '',
          icon: DollarSign,
        };
      case 'wallet.payout':
        return {
          message: 'Settlement payout received',
          details: data.amount ? `${formatCurrency(data.amount, { compact: true })}${data.prediction_title ? ` · ${data.prediction_title}` : ''}` : (data.prediction_title ?? ''),
          icon: DollarSign,
        };
      case 'wallet.platform_fee':
        return {
          message: 'Platform fee credited',
          details: data.amount ? formatCurrency(data.amount, { compact: true }) : '',
          icon: DollarSign,
        };
      case 'wallet.creator_fee':
        return {
          message: 'Creator earnings received',
          details: data.amount ? `${formatCurrency(data.amount, { compact: true })}${data.prediction_title ? ` · ${data.prediction_title}` : ''}` : (data.prediction_title ?? ''),
          icon: DollarSign,
        };
      default:
        return {
          message: 'Activity occurred',
          details: '',
          icon: Clock
        };
    }
  };

  const activity = getActivityMessage(item);
  const Icon = activity.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {item.actor?.avatar_url ? (
          <img
            src={item.actor.avatar_url}
            alt={item.actor.full_name || item.actor.username || 'User'}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <User className="w-4 h-4 text-gray-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <p className="text-sm font-medium text-gray-900 truncate">
            {activity.message}
          </p>
        </div>
        
        {activity.details && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {activity.details}
          </p>
        )}
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">
            {formatTimeAgo(item.timestamp)}
          </span>
          {item.actor?.is_verified && (
            <span className="text-xs text-emerald-600 font-medium">✓ Verified</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Main activity feed component
 */
export function ActivityFeed({ predictionId, className = '' }: ActivityFeedProps) {
  const { items, loading, error, hasMore, loadMore, refresh } = useActivityFeed({
    predictionId,
    limit: 25,
    autoLoad: true
  });

  if (error) {
    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border ${className}`}>
        <div className="text-center py-6">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm text-gray-600 mb-3">Failed to load activity feed</p>
          <button
            onClick={refresh}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (loading && items.length === 0) {
    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border ${className}`}>
        <div className="text-center py-6">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`bg-white rounded-2xl p-4 shadow-sm border ${className}`}>
        <div className="text-center py-6">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-600">No activity yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Be the first to comment or lock a {t('bet')}!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <ActivityItemComponent key={item.id} item={item} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more...
              </div>
            ) : (
              'Load more activity'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
