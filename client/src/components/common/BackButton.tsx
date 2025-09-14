import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'default' | 'minimal' | 'styled';
  className?: string;
  showLabel?: boolean;
}

/**
 * Standardized Back Button Component
 * 
 * Provides consistent back navigation across the app with:
 * - Consistent styling and behavior
 * - Accessibility support
 * - Motion animations
 * - Multiple variants for different contexts
 */
export const BackButton: React.FC<BackButtonProps> = ({
  onClick,
  label = 'Back',
  variant = 'default',
  className = '',
  showLabel = true
}) => {
  const baseClasses = "flex items-center gap-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg";
  
  const variantClasses = {
    default: "text-gray-600 hover:text-gray-900 px-3 py-2 hover:bg-gray-50",
    minimal: "text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-lg",
    styled: "text-white bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30"
  };

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={combinedClasses}
      aria-label={label}
      type="button"
    >
      <ArrowLeft 
        size={20} 
        className="flex-shrink-0" 
        aria-hidden="true"
      />
      {showLabel && (
        <span className="font-medium text-sm">
          {label}
        </span>
      )}
    </motion.button>
  );
};

/**
 * Minimal back button variant for compact spaces
 */
export const MinimalBackButton: React.FC<Omit<BackButtonProps, 'variant'>> = (props) => (
  <BackButton {...props} variant="minimal" showLabel={false} />
);

/**
 * Styled back button for headers with backgrounds
 */
export const StyledBackButton: React.FC<Omit<BackButtonProps, 'variant'>> = (props) => (
  <BackButton {...props} variant="styled" showLabel={false} />
);

export default BackButton;
