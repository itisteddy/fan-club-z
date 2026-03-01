import React from 'react';
import { ArrowLeft, Share2, MoreHorizontal, Search, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { prefersReducedMotion, AriaUtils } from '../../utils/accessibility';

interface HeaderAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  badge?: number | string;
  variant?: 'default' | 'primary' | 'ghost';
}

interface UnifiedHeaderProps {
  // Core content
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  
  // Navigation
  showBack?: boolean;
  onBack?: () => void;
  
  // Actions
  actions?: HeaderAction[];
  
  // Styling
  sticky?: boolean;
  transparent?: boolean;
  className?: string;
  
  // Custom content
  children?: React.ReactNode;
}

const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title,
  subtitle,
  showLogo = false,
  showBack = false,
  onBack,
  actions = [],
  sticky = true,
  transparent = false,
  className = '',
  children
}) => {
  const navigate = useNavigate();
  const reduceMotion = prefersReducedMotion();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
  };

  const getActionButtonClass = (variant: HeaderAction['variant'] = 'default') => {
    const base = 'p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2';
    
    switch (variant) {
      case 'primary':
        return `${base} bg-emerald-500 text-white hover:bg-emerald-600`;
      case 'ghost':
        return `${base} text-gray-400 hover:text-gray-600 hover:bg-gray-100`;
      default:
        return `${base} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
    }
  };

  return (
    <motion.header
      initial={reduceMotion ? {} : { y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`
        ${sticky ? 'sticky top-0 z-40' : ''} 
        ${transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100'} 
        ${className}
      `}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Back Button */}
            {showBack && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                aria-label="Go back"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            )}

            {/* Logo */}
            {showLogo && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">F</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-lg font-bold text-gray-900 truncate">
                    Fan Club Z
                  </span>
                  {subtitle && (
                    <span className="text-sm text-gray-600 truncate">
                      {subtitle}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Title Only */}
            {!showLogo && (title || subtitle) && (
              <div className="flex flex-col min-w-0">
                {title && (
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-600 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
            )}

            {/* Custom Content */}
            {children && (
              <div className="flex-1 min-w-0">
                {children}
              </div>
            )}
          </div>

          {/* Right Section - Actions */}
          {actions.length > 0 && (
            <div className="flex items-center space-x-2 ml-3">
              {actions.map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className={getActionButtonClass(action.variant)}
                    aria-label={action.label}
                  >
                    <div className="relative">
                      <IconComponent className="w-5 h-5" />
                      {action.badge && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {typeof action.badge === 'number' && action.badge > 99 ? '99+' : action.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
};

export default UnifiedHeader;
