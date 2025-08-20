import React, { useState, useEffect } from 'react';
import { Bell, User, MessageCircle, Trophy, Settings as SettingsIcon } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';

interface NotificationBellProps {
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onClick,
  className = ''
}) => {
  const { unreadCount } = useNotificationStore();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
    >
      <Bell 
        className={`w-6 h-6 text-gray-600 transition-transform ${
          isAnimating ? 'animate-pulse' : ''
        }`} 
      />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
};

// Mini notification components for different areas
export const ActivityIndicator: React.FC<{ type: 'comment' | 'like' | 'prediction' | 'payout' }> = ({ type }) => {
  const getIcon = () => {
    switch (type) {
      case 'comment':
        return <MessageCircle className="w-4 h-4" />;
      case 'like':
        return <span className="text-red-500">♥</span>;
      case 'prediction':
        return <Trophy className="w-4 h-4" />;
      case 'payout':
        return <span className="text-green-500">$</span>;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'comment':
        return 'text-blue-500';
      case 'like':
        return 'text-red-500';
      case 'prediction':
        return 'text-purple-500';
      case 'payout':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`inline-flex items-center gap-1 ${getColor()}`}>
      {getIcon()}
    </div>
  );
};

export const LiveActivityBadge: React.FC<{ count?: number; isLive?: boolean }> = ({ 
  count = 0, 
  isLive = false 
}) => {
  return (
    <div className="inline-flex items-center gap-2">
      {isLive && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-red-500 font-medium">LIVE</span>
        </div>
      )}
      {count > 0 && (
        <span className="text-xs text-gray-500">
          {count} watching
        </span>
      )}
    </div>
  );
};

// Quick action notification (for immediate feedback)
export const QuickNotification: React.FC<{
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };

  return (
    <div className={`
      fixed top-16 left-1/2 transform -translate-x-1/2 z-[11500]
      px-4 py-2 rounded-full text-sm font-medium
      animate-bounce
      ${getStyles()}
    `}>
      {message}
    </div>
  );
};
