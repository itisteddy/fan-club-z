import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  className?: string;
}

/**
 * Notification bell component with unread badge
 * Shows unread count and navigates to notifications page on click
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { unreadCount, refreshUnreadCount } = useNotifications({ 
    autoRefresh: true,
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // Refresh on mount and window focus
  React.useEffect(() => {
    refreshUnreadCount();
    
    const handleFocus = () => {
      refreshUnreadCount();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshUnreadCount]);

  const handleClick = () => {
    navigate('/notifications');
  };

  const displayCount = unreadCount > 99 ? '9+' : unreadCount;

  return (
    <button
      onClick={handleClick}
      className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <Bell 
        className={`w-6 h-6 text-gray-600 transition-transform ${
          unreadCount > 0 ? 'animate-pulse' : ''
        }`} 
      />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium px-1">
          {displayCount}
        </div>
      )}
    </button>
  );
};

export default NotificationBell;
