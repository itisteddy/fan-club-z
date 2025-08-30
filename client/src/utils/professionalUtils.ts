/**
 * Professional Design System Utilities
 * Helper functions and utilities for applying professional trading design patterns
 */

// Button style variants following professional design language
export const professionalButtonClasses = {
  primary: 'fc-btn fc-btn-primary',
  secondary: 'fc-btn fc-btn-secondary', 
  success: 'fc-btn fc-btn-success',
  danger: 'fc-btn fc-btn-danger',
  outline: 'fc-btn fc-btn-outline',
  
  // Sizes
  small: 'fc-btn-sm',
  large: 'fc-btn-lg',
};

// Card style variants
export const professionalCardClasses = {
  default: 'fc-card',
  market: 'fc-market-card',
  compact: 'fc-card fc-card-compact',
};

// Text style variants
export const professionalTextClasses = {
  // Sizes
  xs: 'fc-text-xs',
  sm: 'fc-text-sm', 
  base: 'fc-text-base',
  lg: 'fc-text-lg',
  xl: 'fc-text-xl',
  '2xl': 'fc-text-2xl',
  '3xl': 'fc-text-3xl',
  
  // Weights
  medium: 'fc-font-medium',
  semibold: 'fc-font-semibold',
  bold: 'fc-font-bold',
  
  // Colors
  primary: 'fc-text-primary',
  success: 'fc-text-success', 
  danger: 'fc-text-danger',
  neutral: 'fc-text-neutral',
  muted: 'fc-text-muted',
};

// Status indicator classes
export const professionalStatusClasses = {
  active: 'fc-status fc-status-active',
  closed: 'fc-status fc-status-closed',
  settled: 'fc-status fc-status-settled',
};

// Layout utility classes
export const professionalLayoutClasses = {
  container: 'fc-container',
  grid: 'fc-grid',
  grid2: 'fc-grid fc-grid-2',
  grid3: 'fc-grid fc-grid-3', 
  grid4: 'fc-grid fc-grid-4',
  flex: 'fc-flex',
  flexBetween: 'fc-flex-between',
  flexCenter: 'fc-flex-center',
};

// Spacing utility classes
export const professionalSpacingClasses = {
  mb1: 'fc-mb-1',
  mb2: 'fc-mb-2',
  mb3: 'fc-mb-3',
  mb4: 'fc-mb-4',
  mb6: 'fc-mb-6',
  mb8: 'fc-mb-8',
  mt1: 'fc-mt-1',
  mt2: 'fc-mt-2',
  mt3: 'fc-mt-3',
  mt4: 'fc-mt-4',
  mt6: 'fc-mt-6',
  mt8: 'fc-mt-8',
};

// Animation classes
export const professionalAnimationClasses = {
  fadeIn: 'fc-animate-fade-in',
  slideUp: 'fc-animate-slide-up',
};

/**
 * Utility function to combine multiple professional class sets
 */
export const combineProfessionalClasses = (...classArrays: (string | undefined)[]): string => {
  return classArrays.filter(Boolean).join(' ');
};

/**
 * Format currency in trading style (K/M abbreviations)
 */
export const formatProfessionalCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

/**
 * Format percentage as cents (trading style)
 */
export const formatProfessionalPercentage = (value: number): string => {
  return `${Math.round(value)}¢`;
};

/**
 * Get category color scheme
 */
export const getProfessionalCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    sports: 'bg-blue-50 text-blue-700 border-blue-200',
    politics: 'bg-purple-50 text-purple-700 border-purple-200',
    entertainment: 'bg-pink-50 text-pink-700 border-pink-200',
    crypto: 'bg-orange-50 text-orange-700 border-orange-200',
    business: 'bg-green-50 text-green-700 border-green-200',
    science: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    pop_culture: 'bg-pink-50 text-pink-700 border-pink-200',
    custom: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  
  return colors[category] || colors.custom;
};

/**
 * Generate consistent price change styling
 */
export const getProfessionalPriceChangeStyle = (change: number): string => {
  if (change > 0) {
    return 'fc-price-change fc-price-up';
  }
  if (change < 0) {
    return 'fc-price-change fc-price-down';
  }
  return 'fc-price-change';
};

/**
 * Create a professional gradient for avatars or elements
 */
export const generateProfessionalGradient = (seed: string): string => {
  const gradients = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600', 
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-indigo-400 to-indigo-600',
    'from-orange-400 to-orange-600',
    'from-teal-400 to-teal-600',
    'from-red-400 to-red-600',
  ];
  
  const hash = seed.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return gradients[Math.abs(hash) % gradients.length];
};

/**
 * Professional status indicator
 */
export const getProfessionalStatusClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
    case 'open':
      return professionalStatusClasses.active;
    case 'closed':
    case 'ended':
      return professionalStatusClasses.closed;
    case 'settled':
    case 'resolved':
      return professionalStatusClasses.settled;
    default:
      return 'fc-status';
  }
};

export default {
  buttonClasses: professionalButtonClasses,
  cardClasses: professionalCardClasses,
  textClasses: professionalTextClasses,
  statusClasses: professionalStatusClasses,
  layoutClasses: professionalLayoutClasses,
  spacingClasses: professionalSpacingClasses,
  animationClasses: professionalAnimationClasses,
  combineClasses: combineProfessionalClasses,
  formatCurrency: formatProfessionalCurrency,
  formatPercentage: formatProfessionalPercentage,
  getCategoryColor: getProfessionalCategoryColor,
  getPriceChangeStyle: getProfessionalPriceChangeStyle,
  generateGradient: generateProfessionalGradient,
  getStatusClass: getProfessionalStatusClass,
};
