import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Loader2, ArrowRight, Trophy, DollarSign, MessageCircle, AlertCircle, Clock } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notifications page - displays list of notifications with mark read functionality
 */
export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    fetchNotifications,
    markRead,
    markAllRead,
    loadMore,
  } = useNotifications({ limit: 20, autoRefresh: false });

  const [markingRead, setMarkingRead] = useState<string[]>([]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'win':
        return <Trophy className="w-5 h-5 text-emerald-500" />;
      case 'loss':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'payout':
      case 'claim':
        return <DollarSign className="w-5 h-5 text-teal-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-purple-500" />;
      case 'refund':
        return <DollarSign className="w-5 h-5 text-slate-500" />;
      case 'dispute':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'demo_credit':
        return <DollarSign className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleNotificationClick = useCallback(
    async (notification: Notification) => {
      // Mark as read if unread
      if (!notification.readAt) {
        setMarkingRead((prev) => [...prev, notification.id]);
        try {
          await markRead([notification.id]);
        } catch (err) {
          console.error('[NotificationsPage] Failed to mark read:', err);
        } finally {
          setMarkingRead((prev) => prev.filter((id) => id !== notification.id));
        }
      }

      // Navigate to href if present
      if (notification.href) {
        // Handle query params in href (e.g., /prediction/:id?tab=comments)
        const [path, query] = notification.href.split('?');
        if (path) {
          if (query) {
            navigate(`${path}?${query}`);
          } else {
            navigate(path);
          }
        }
      }
    },
    [markRead, navigate]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead();
    } catch (err) {
      console.error('[NotificationsPage] Failed to mark all read:', err);
    }
  }, [markAllRead]);

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-medium mb-2">Failed to load notifications</p>
          <p className="text-gray-600 text-sm mb-4">{error.message}</p>
          <button
            onClick={() => fetchNotifications()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Go back"
            >
              <ArrowRight className="w-5 h-5 text-gray-600 rotate-180" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingRead.length > 0}
              className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">No notifications yet</p>
            <p className="text-gray-600 text-sm">
              You'll see notifications here when you win, receive payouts, or get updates.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const isMarking = markingRead.includes(notification.id);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  disabled={isMarking}
                  className={`w-full text-left p-4 bg-white rounded-lg border transition-colors ${
                    isUnread
                      ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/50'
                      : 'border-gray-200 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.body}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {isUnread && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          </div>
                        )}
                        {isMarking && (
                          <div className="flex-shrink-0">
                            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </span>
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
