import React from 'react';

interface SettlementBadgeProps {
  method: 'auto' | 'manual';
  badges?: Array<'Manual-Checked' | 'Auto-Settled' | 'Oracle'>;
  className?: string;
}

export const SettlementBadge: React.FC<SettlementBadgeProps> = ({ 
  method, 
  badges = [], 
  className = "" 
}) => {
  const getBadgeInfo = () => {
    if (badges.includes('Oracle')) {
      return {
        text: 'Oracle',
        icon: '🔮',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200'
      };
    }
    
    if (badges.includes('Auto-Settled')) {
      return {
        text: 'Auto-Settled',
        icon: '⚡',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200'
      };
    }
    
    if (badges.includes('Manual-Checked')) {
      return {
        text: 'Manual-Checked',
        icon: '✓',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200'
      };
    }
    
    // Default based on method
    if (method === 'auto') {
      return {
        text: 'Auto-Settlement',
        icon: '⚡',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-200'
      };
    }
    
    return {
      text: 'Manual Settlement',
      icon: '👤',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200'
    };
  };

  const { text, icon, bgColor, textColor, borderColor } = getBadgeInfo();

  return (
    <div className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 
      ${bgColor} ${textColor} ${borderColor}
      border rounded-full text-xs font-medium
      ${className}
    `}>
      <span className="text-xs">{icon}</span>
      <span>{text}</span>
    </div>
  );
};
