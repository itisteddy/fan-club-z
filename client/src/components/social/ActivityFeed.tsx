import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Heart, 
  Target, 
  Trophy, 
  TrendingUp, 
  UserPlus,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { useAuthStore } from '../../store/authStore';
import { useLocation } from 'wouter';
import { socialApiService, ActivityItem } from '../../services/socialApiService';

interface ActivityFeedProps {
  className?: string;
  limit?: number;
  showUserAvatars?: boolean;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  className = '',
  limit = 10,
  showUserAvatars = true
}) => {
  const { user: currentUser } = useAuthStore();
  const [, setLocation] = useLocation();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const activities = await socialApiService.getActivityFeed({ limit });
        setActivities(activities);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [limit]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'prediction_created':
        return <Target className="w-4 h-4 text-blue-500" />;
      case 'prediction_won':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'comment_added':
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case 'like_received':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'followed_user':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      case 'achievement_earned':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.metadata?.predictionId) {
      setLocation(`/prediction/${activity.metadata.predictionId}`);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-2xl p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm ${className}`}>
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-600">Latest community activities and interactions</p>
      </div>

      <div className="p-4">
        <AnimatePresence>
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                activity.metadata?.predictionId 
                  ? 'hover:bg-gray-50 cursor-pointer' 
                  : ''
              }`}
              onClick={() => handleActivityClick(activity)}
            >
              {showUserAvatars && (
                <div className="flex-shrink-0">
                  <UserAvatar
                    src={activity.userAvatar}
                    alt={activity.username}
                    size="sm"
                    className="w-10 h-10"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 text-sm">
                    {activity.username}
                  </span>
                  {getActivityIcon(activity.type)}
                </div>
                
                <p className="text-sm text-gray-600 mb-1">
                  {activity.content}
                  {activity.metadata?.predictionTitle && (
                    <span className="font-medium text-gray-900">
                      : "{activity.metadata.predictionTitle}"
                    </span>
                  )}
                  {activity.metadata?.amount && (
                    <span className="font-medium text-green-600">
                      ${activity.metadata.amount}
                    </span>
                  )}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                  
                  {activity.metadata?.predictionId && (
                    <button className="text-xs text-blue-500 hover:text-blue-600 transition-colors">
                      View
                    </button>
                  )}
                </div>
              </div>

              <button className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {activities.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};
