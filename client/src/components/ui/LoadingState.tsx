import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullScreen?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
  fullScreen = false,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          spinner: 'h-4 w-4',
          text: 'text-sm',
          container: 'py-4',
        };
      case 'lg':
        return {
          spinner: 'h-8 w-8',
          text: 'text-lg',
          container: 'py-8',
        };
      case 'md':
      default:
        return {
          spinner: 'h-6 w-6',
          text: 'text-base',
          container: 'py-6',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const content = (
    <div className={`flex flex-col items-center justify-center ${sizeClasses.container} ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${sizeClasses.spinner} text-emerald-500`}
      >
        <Loader2 className="h-full w-full" />
      </motion.div>
      {message && (
        <p className={`mt-3 text-gray-600 ${sizeClasses.text}`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingState;
