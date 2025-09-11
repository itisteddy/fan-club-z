import React from 'react';
import { ArrowLeft } from 'lucide-react';

type MobileHeaderProps = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: React.ReactNode; // actions (share, edit, profile avatar, etc.)
  elevated?: boolean; // apply shadow on scroll
};

export default function MobileHeader({ 
  title, 
  showBack, 
  onBack, 
  right, 
  elevated = false 
}: MobileHeaderProps) {
  return (
    <header 
      className={`sticky top-0 z-40 h-14 px-4 bg-white ${
        elevated ? 'shadow-sm border-b border-gray-100' : ''
      }`}
    >
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center gap-2">
          {showBack && (
            <button 
              aria-label="Back" 
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          )}
          {title && (
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
              {title}
            </h1>
          )}
        </div>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
