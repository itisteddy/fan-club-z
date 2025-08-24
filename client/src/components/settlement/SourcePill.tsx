import React from 'react';
import { SettlementSource } from '../../../../shared/schema';

interface SourcePillProps {
  source: SettlementSource;
  isPrimary?: boolean;
  className?: string;
}

export const SourcePill: React.FC<SourcePillProps> = ({ 
  source, 
  isPrimary = false, 
  className = "" 
}) => {
  const getTrustLevelColor = (level?: string) => {
    switch (level) {
      case 'high':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleOpenSource = () => {
    window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`
      inline-flex items-center gap-2 px-3 py-1.5 
      border rounded-full text-xs font-medium cursor-pointer
      hover:shadow-sm transition-shadow
      ${getTrustLevelColor(source.trust_level)}
      ${className}
    `} onClick={handleOpenSource}>
      {/* Favicon placeholder */}
      <div className="w-3 h-3 bg-gray-400 rounded-sm flex items-center justify-center">
        <span className="text-white text-[8px]">🌐</span>
      </div>
      
      <span>{source.name}</span>
      
      {isPrimary && (
        <span className="bg-blue-500 text-white px-1 py-0.5 rounded text-[8px] font-semibold">
          PRIMARY
        </span>
      )}
      
      <span className="text-gray-500">
        {getDomainFromUrl(source.url)}
      </span>
    </div>
  );
};
