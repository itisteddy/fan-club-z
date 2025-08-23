/**
 * API Health Indicator Component
 * Shows users when there are API connectivity issues
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { testApiConnectivity } from '../lib/apiUtils';

interface ApiHealthIndicatorProps {
  showWhenHealthy?: boolean;
  className?: string;
}

export const ApiHealthIndicator: React.FC<ApiHealthIndicatorProps> = ({ 
  showWhenHealthy = false,
  className = ''
}) => {
  const [isHealthy, setIsHealthy] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const healthy = await testApiConnectivity();
      setIsHealthy(healthy);
      setLastCheck(new Date());
    } catch (error) {
      setIsHealthy(false);
      setLastCheck(new Date());
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Don't show if healthy and showWhenHealthy is false
  if (isHealthy && !showWhenHealthy) {
    return null;
  }

  const getStatusInfo = () => {
    if (isChecking) {
      return {
        icon: WifiOff,
        text: 'Checking connection...',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200'
      };
    }

    if (isHealthy) {
      return {
        icon: CheckCircle,
        text: 'Connected',
        color: 'text-teal-600',
        bgColor: 'bg-teal-50 border-teal-200'
      };
    }

    return {
      icon: AlertTriangle,
      text: 'Connection issues detected',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200'
    };
  };

  const { icon: Icon, text, color, bgColor } = getStatusInfo();

  return (
    <div className={`
      flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
      ${bgColor} ${color} ${className}
    `}>
      <Icon size={16} />
      <span className="font-medium">{text}</span>
      {lastCheck && (
        <span className="text-xs opacity-75 ml-auto">
          {lastCheck.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default ApiHealthIndicator;
