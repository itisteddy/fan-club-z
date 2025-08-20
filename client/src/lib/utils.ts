import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const formatters: Record<string, Intl.NumberFormat> = {
    NGN: new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    USD: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),
    USDT: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
    ETH: new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 8,
    }),
  };

  const formatter = formatters[currency] || formatters.USD;
  
  if (currency === 'USDT') {
    return `${formatter.format(amount)} USDT`;
  }
  
  if (currency === 'ETH') {
    return `${formatter.format(amount)} ETH`;
  }
  
  return formatter.format(amount);
};

export const formatTimeRemaining = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return 'Ended';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffYears = Math.floor(diffDays / 365);

  // For very long periods (over 999 hours = ~41 days), use years and days
  if (diffHours > 999) {
    if (diffYears > 0) {
      const remainingDays = diffDays % 365;
      if (remainingDays > 0) {
        return `${diffYears}y ${remainingDays}d left`;
      } else {
        return `${diffYears}y left`;
      }
    } else {
      return `${diffDays}d left`;
    }
  }

  // Standard formatting for shorter periods
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;
  if (diffHours > 0) return `${diffHours}h left`;
  if (diffMins > 0) return `${diffMins}m left`;
  
  return 'Ending soon';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 30) return 'now';
  if (diffMins < 1) return `${diffSecs}s`;
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffWeeks < 4) return `${diffWeeks}w`;
  if (diffMonths < 12) return `${diffMonths}mo`;
  
  return `${diffYears}y`;
};

export const calculateOdds = (totalPool: number, optionStaked: number): number => {
  if (optionStaked === 0) return 1;
  return Math.max(1, totalPool / optionStaked);
};

export const calculatePotentialPayout = (stake: number, odds: number): number => {
  return stake * odds;
};

export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const generateInitials = (name?: string): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export const getAvatarUrl = (user: { avatar_url?: string; username?: string; full_name?: string }): string => {
  if (user.avatar_url) return user.avatar_url;
  
  const initials = generateInitials(user.full_name || user.username);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=00D084&color=fff&size=128`;
};
