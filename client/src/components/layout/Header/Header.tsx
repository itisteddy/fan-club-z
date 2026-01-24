import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '../../../utils/cn';
import { Subnav } from './Subnav';
import { useHeaderShadow } from './useHeaderShadow';

interface HeaderProps {
  title?: string;
  back?: boolean;
  onBack?: () => void;
  trailing?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ 
  title, 
  back = false, 
  onBack, 
  trailing,
  action,
  children,
  className 
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const { showShadow, headerRef } = useHeaderShadow();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };

  return (
    <header
      ref={headerRef}
      className={cn(
        // Base styling
        'sticky top-0 z-40 bg-white',
        // Phase 4: Safe-area aware height - outer container includes safe-area inset
        // Height: 56px content + safe-area-inset-top
        'h-[calc(56px+env(safe-area-inset-top))] md:h-[calc(64px+env(safe-area-inset-top))]',
        // Phase 4: Apply safe-area padding only once (on outer container)
        'pt-[env(safe-area-inset-top)]',
        // Border
        'border-b border-gray-100',
        // Shadow (only when scrolled)
        showShadow && 'shadow-sm',
        className
      )}
    >
      {/* Phase 4: Inner row with fixed height - content never overlaps notch */}
      <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6">
        {/* Left section */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Back button */}
          {back && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Title */}
          {title && (
            <h1 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
              {title}
            </h1>
          )}

          {/* Custom content */}
          {children && (
            <div className="flex-1 min-w-0">
              {children}
            </div>
          )}
        </div>

        {/* Right section - Trailing actions */}
        {(trailing ?? action) && (
          <div className="flex items-center space-x-2 ml-3">
            {trailing ?? action}
          </div>
        )}
      </div>
    </header>
  );
}

// Export both named and default
export { Subnav };
export default Header;
