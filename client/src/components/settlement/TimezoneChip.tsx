import React, { useState } from 'react';

interface TimezoneChipProps {
  timezone: string;
  timestamp: string | Date;
  className?: string;
}

export const TimezoneChip: React.FC<TimezoneChipProps> = ({ 
  timezone, 
  timestamp, 
  className = "" 
}) => {
  const [showUTC, setShowUTC] = useState(false);
  
  const date = new Date(timestamp);
  
  const formatTime = (date: Date, tz: string) => {
    if (tz === 'UTC' || showUTC) {
      return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }
    
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      }).format(date);
    } catch {
      // Fallback to UTC if timezone is invalid
      return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    }
  };

  const handleToggle = () => {
    setShowUTC(!showUTC);
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <button
        onClick={handleToggle}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium 
                   text-gray-700 bg-gray-100 hover:bg-gray-200 
                   border border-gray-200 rounded transition-colors"
      >
        <span className="text-[10px]">🕐</span>
        <span>{formatTime(date, timezone)}</span>
        <span className="text-[10px] text-gray-500">
          {showUTC ? '→ Local' : '→ UTC'}
        </span>
      </button>
    </div>
  );
};
