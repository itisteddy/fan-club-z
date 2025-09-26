import React from 'react';
import { ArrowLeft, X, MoreHorizontal } from 'lucide-react';
import { qaLog } from '../../utils/devQa';

interface MobileHeaderProps {
  title: string;
  leftAction?: {
    type: 'back' | 'close' | 'none';
    onClick?: () => void;
    'aria-label'?: string;
  };
  rightAction?: {
    type: 'menu' | 'custom' | 'none';
    icon?: React.ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  };
  statusChip?: {
    label: string;
    variant: 'success' | 'warning' | 'info' | 'neutral';
  };
  className?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  leftAction = { type: 'none' },
  rightAction = { type: 'none' },
  statusChip,
  className = ''
}) => {
  qaLog('[MobileHeader] Rendering:', { title, leftAction: leftAction.type, rightAction: rightAction.type });

  const getLeftIcon = () => {
    switch (leftAction.type) {
      case 'back':
        return <ArrowLeft className="w-6 h-6" />;
      case 'close':
        return <X className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getRightIcon = () => {
    if (rightAction.type === 'custom' && rightAction.icon) {
      return rightAction.icon;
    }
    if (rightAction.type === 'menu') {
      return <MoreHorizontal className="w-6 h-6" />;
    }
    return null;
  };

  const getStatusChipStyles = (variant: string) => {
    const baseStyles = 'px-2 py-1 rounded text-meta font-medium';
    switch (variant) {
      case 'success':
        return `${baseStyles} bg-emerald-100 text-emerald-700`;
      case 'warning':
        return `${baseStyles} bg-orange-100 text-orange-700`;
      case 'info':
        return `${baseStyles} bg-blue-100 text-blue-700`;
      case 'neutral':
      default:
        return `${baseStyles} bg-gray-100 text-gray-700`;
    }
  };

  return (
    <header 
      className={`
        sticky top-0 z-10 
        bg-white 
        border-b border-gray-200 
        px-5 py-3
        flex items-center justify-between
        safe-top
        ${className}
      `}
      style={{
        height: 'var(--size-header-height)',
        minHeight: 'var(--size-header-height)'
      }}
    >
      {/* Left Action */}
      <div className="flex items-center">
        {leftAction.type !== 'none' && (
          <button
            onClick={leftAction.onClick}
            className="
              touch-target
              flex items-center justify-center
              rounded-full
              transition-colors
              hover:bg-gray-100
              focus-ring
            "
            aria-label={leftAction['aria-label'] || `${leftAction.type} action`}
          >
            {getLeftIcon()}
          </button>
        )}
      </div>

      {/* Title and Status */}
      <div className="flex-1 flex items-center justify-between min-w-0 mx-3">
        <h1 className="text-title line-clamp-1 flex-1 min-w-0">
          {title}
        </h1>
        
        {statusChip && (
          <div className={getStatusChipStyles(statusChip.variant)}>
            {statusChip.label}
          </div>
        )}
      </div>

      {/* Right Action */}
      <div className="flex items-center">
        {rightAction.type !== 'none' && (
          <button
            onClick={rightAction.onClick}
            className="
              touch-target
              flex items-center justify-center
              rounded-full
              transition-colors
              hover:bg-gray-100
              focus-ring
            "
            aria-label={rightAction['aria-label'] || `${rightAction.type} action`}
          >
            {getRightIcon()}
          </button>
        )}
      </div>
    </header>
  );
};

export default MobileHeader;
