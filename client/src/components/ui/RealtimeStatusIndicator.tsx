import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { useRealtimeService } from '../../services/realtimeService';

interface RealtimeStatusIndicatorProps {
  className?: string;
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({ 
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const { getStatus } = useRealtimeService();

  useEffect(() => {
    const checkStatus = () => {
      const connectionStatus = getStatus();
      
      if (connectionStatus.isConnected) {
        setStatus('connected');
        setIsVisible(true);
      } else if (connectionStatus.reconnectAttempts > 0) {
        setStatus('connecting');
        setIsVisible(true);
      } else {
        setStatus('disconnected');
        setIsVisible(false);
      }
    };

    // Check status immediately
    checkStatus();

    // Check status every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, [getStatus]);

  if (!isVisible) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Activity className="w-3 h-3 text-green-500 animate-pulse" />,
          text: 'Live',
          bgColor: 'bg-green-50',
          textColor: 'text-green-700',
          borderColor: 'border-green-200'
        };
      case 'connecting':
        return {
          icon: <Wifi className="w-3 h-3 text-yellow-500 animate-spin" />,
          text: 'Connecting...',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      case 'disconnected':
        return {
          icon: <WifiOff className="w-3 h-3 text-red-500" />,
          text: 'Offline',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700',
          borderColor: 'border-red-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        shadow-sm backdrop-blur-sm
        transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}>
        {config.icon}
        <span className="text-xs font-medium">{config.text}</span>
      </div>
    </div>
  );
};
