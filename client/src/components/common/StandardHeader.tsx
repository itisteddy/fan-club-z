import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface StandardHeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'minimal';
}

const StandardHeader: React.FC<StandardHeaderProps> = ({
  title,
  onBack,
  rightElement,
  className = '',
  variant = 'default'
}) => {
  const getHeaderStyles = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-gradient-to-r from-purple-500 to-emerald-600 text-white';
      case 'minimal':
        return 'bg-transparent border-none';
      default:
        return 'bg-white/95 backdrop-blur-sm border-b border-gray-200';
    }
  };

  const getBackButtonStyles = () => {
    switch (variant) {
      case 'gradient':
        return 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30';
      case 'minimal':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-600';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-600';
    }
  };

  const getTitleStyles = () => {
    switch (variant) {
      case 'gradient':
        return 'text-white text-xl font-bold';
      case 'minimal':
        return 'text-gray-900 text-lg font-semibold';
      default:
        return 'text-gray-900 text-xl font-semibold';
    }
  };

  return (
    <header className={`sticky top-0 z-50 ${getHeaderStyles()} ${className}`}>
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${getBackButtonStyles()}`}
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            
            <h1 className={`${getTitleStyles()} truncate max-w-[200px] sm:max-w-none`}>
              {title}
            </h1>
          </div>
          
          {rightElement && (
            <div className="flex items-center gap-2">
              {rightElement}
            </div>
          )}
          
          {!rightElement && onBack && (
            <div className="w-10" /> // Spacer for centering when only back button exists
          )}
        </div>
      </div>
    </header>
  );
};

export default StandardHeader;
