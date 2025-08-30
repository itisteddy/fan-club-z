import React from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface ErrorStateProps {
  error?: string | Error | null;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'page' | 'toast';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  variant = 'inline',
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : error.message;
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                        errorMessage.toLowerCase().includes('fetch') ||
                        errorMessage.toLowerCase().includes('connection');

  const getIcon = () => {
    if (!showIcon) return null;
    
    if (isNetworkError) {
      return <WifiOff className={getIconSize()} />;
    }
    return <AlertTriangle className={getIconSize()} />;
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'px-2 py-1 text-xs';
      case 'lg': return 'px-4 py-2 text-sm';
      default: return 'px-3 py-1.5 text-xs';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'card':
        return 'bg-red-50 border border-red-200 rounded-lg p-4';
      case 'page':
        return 'bg-red-50 border border-red-200 rounded-xl p-6 max-w-md mx-auto';
      case 'toast':
        return 'bg-red-100 border border-red-300 rounded-lg p-3 shadow-sm';
      default:
        return 'bg-red-50 border border-red-200 rounded-md p-3';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${getVariantStyles()} ${className}`}
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div className="flex-shrink-0 text-red-500 mt-0.5">
            {getIcon()}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <p className={`text-red-800 font-medium ${getTextSize()}`}>
            {isNetworkError ? 'Connection Problem' : 'Something went wrong'}
          </p>
          <p className={`text-red-600 mt-1 ${getTextSize()}`}>
            {errorMessage}
          </p>
          
          {onRetry && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRetry}
              className={`mt-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors inline-flex items-center gap-2 ${getButtonSize()}`}
            >
              <RefreshCw className="w-3 h-3" />
              Try Again
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ErrorState;
