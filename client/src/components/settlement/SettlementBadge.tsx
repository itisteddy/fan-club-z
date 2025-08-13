import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Shield, Zap } from 'lucide-react';

interface SettlementBadgeProps {
  type: 'auto-settled' | 'manual-checked' | 'oracle-on-chain';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const SettlementBadge: React.FC<SettlementBadgeProps> = ({ 
  type, 
  size = 'md', 
  animated = false 
}) => {
  const getBadgeConfig = () => {
    switch (type) {
      case 'auto-settled':
        return {
          label: 'Auto-Settled',
          icon: Zap,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600'
        };
      case 'manual-checked':
        return {
          label: 'Manual-Checked',
          icon: Shield,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600'
        };
      case 'oracle-on-chain':
        return {
          label: 'Oracle-On-Chain',
          icon: CheckCircle,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800',
          borderColor: 'border-purple-200',
          iconColor: 'text-purple-600'
        };
      default:
        return {
          label: 'Unknown',
          icon: AlertCircle,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600'
        };
    }
  };

  const config = getBadgeConfig();
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

  const BadgeContent = () => (
    <div className={`
      inline-flex items-center gap-1.5 rounded-full border font-medium
      ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]}
    `}>
      <Icon size={iconSizes[size]} className={config.iconColor} />
      <span>{config.label}</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <BadgeContent />
      </motion.div>
    );
  }

  return <BadgeContent />;
};

export default SettlementBadge;
