import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Shield, AlertTriangle, Clock } from 'lucide-react';

interface SourcePillProps {
  name: string;
  url: string;
  trustLevel: 'high' | 'medium' | 'pending';
  size?: 'sm' | 'md' | 'lg';
  clickable?: boolean;
  onClick?: () => void;
}

const SourcePill: React.FC<SourcePillProps> = ({ 
  name, 
  url, 
  trustLevel, 
  size = 'md',
  clickable = false,
  onClick 
}) => {
  const getTrustLevelConfig = () => {
    switch (trustLevel) {
      case 'high':
        return {
          icon: Shield,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          label: 'High Trust'
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          label: 'Medium Trust'
        };
      case 'pending':
        return {
          icon: Clock,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          label: 'Pending Review'
        };
      default:
        return {
          icon: Clock,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          label: 'Unknown'
        };
    }
  };

  const config = getTrustLevelConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick();
    } else if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const PillContent = () => (
    <div className={`
      inline-flex items-center gap-2 rounded-lg border font-medium transition-all
      ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]}
      ${clickable || url ? 'cursor-pointer hover:shadow-md' : ''}
    `}>
      <Icon size={iconSizes[size]} className={config.iconColor} />
      <div className="flex flex-col">
        <span className="font-semibold">{name}</span>
        <span className="text-xs opacity-75">{getDomainFromUrl(url)}</span>
      </div>
      {(clickable || url) && (
        <ExternalLink size={iconSizes[size] - 2} className="opacity-60" />
      )}
    </div>
  );

  if (clickable || url) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
      >
        <PillContent />
      </motion.div>
    );
  }

  return <PillContent />;
};

export default SourcePill;
