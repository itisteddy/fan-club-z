import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2, Trophy, DollarSign, MessageCircle, AlertCircle, Clock, ArrowLeft, CheckCheck } from 'lucide-react';
import { useNotifications, Notification } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import Page from '../components/ui/layout/Page';
import EmptyState from '../components/ui/empty/EmptyState';
import { cn } from '../utils/cn';

/**
 * Notifications page - displays list of notifications with mark read functionality
 * Uses custom header matching PredictionDetailsPageV2 styling for consistency
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
  const [markingAllRead, setMarkingAllRead] = useState(false);

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
    setMarkingAllRead(true);
    try {
      await markAllRead();
    } catch (err) {
      console.error('[NotificationsPage] Failed to mark all read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  }, [markAllRead]);

  // Loading state
  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header - Consistent with AppHeader/PredictionDetailsPageV2 styling */}
        <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
          <div className="safe-px mx-auto max-w-screen-md">
            <div className="h-12 flex items-center justify-between gap-2 px-4">
              <div className="min-w-[40px] flex items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-base font-semibold leading-none truncate">Notifications</h1>
              </div>
              <div className="min-w-[40px]" />
            </div>
          </div>
          <div className="border-b border-gray-200" />
        </header>
        
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
          <div className="safe-px mx-auto max-w-screen-md">
            <div className="h-12 flex items-center justify-between gap-2 px-4">
              <div className="min-w-[40px] flex items-center">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 text-center">
                <h1 className="text-base font-semibold leading-none truncate">Notifications</h1>
              </div>
              <div className="min-w-[40px]" />
            </div>
          </div>
          <div className="border-b border-gray-200" />
        </header>
        
        <div className="flex items-center justify-center p-4 py-20">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">Failed to load notifications</p>
            <p className="text-gray-600 text-sm mb-4">{error.message}</p>
            <button
              onClick={() => fetchNotifications()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Consistent with AppHeader/PredictionDetailsPageV2 styling */}
      <header className="w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0">
        <div className="safe-px mx-auto max-w-screen-md">
          <div className="h-12 flex items-center justify-between gap-2 px-4">
            <div className="min-w-[40px] flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 text-center">
              <h1 className="text-base font-semibold leading-none truncate">Notifications</h1>
            </div>
            <div className="min-w-[40px] flex items-center justify-end">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={markingAllRead || markingRead.length > 0}
                  className="p-2 text-gray-600 hover:text-emerald-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
                  aria-label="Mark all as read"
                  title="Mark all as read"
                >
                  {markingAllRead ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="border-b border-gray-200" />
      </header>

      {/* Notifications List */}
      <Page className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell />}
            title="No notifications yet"
            description="You'll see notifications here when you win, receive payouts, or get updates."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const isMarking = markingRead.includes(notification.id);

              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  disabled={isMarking}
                  className={cn(
                    // Match app Card primitive styling
                    'w-full text-left bg-white rounded-2xl border border-black/[0.06] p-4 md:p-5',
                    'transition-colors active:scale-[0.99]',
                    isUnread ? 'bg-emerald-50/40' : 'hover:bg-gray-50',
                    isMarking && 'opacity-60'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      'mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-black/[0.06] bg-white',
                      isUnread ? 'shadow-[0_1px_0_rgba(0,0,0,0.02)]' : ''
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm md:text-base font-semibold leading-tight', isUnread ? 'text-gray-900' : 'text-gray-800')}>
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.body}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2 font-medium">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {isUnread ? (
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                              New
                            </span>
                          </div>
                        ) : null}
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
          <div className="mt-4 text-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-black/[0.06] bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-50 transition-colors"
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
      </Page>
    </div>
  );
};

export default NotificationsPage;
