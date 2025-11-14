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
  const target = new Date(dateString).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (!Number.isFinite(diffMs)) return '';
  if (diffMs <= 0) return 'Ended';

  const diffSeconds = Math.floor(diffMs / 1000);

  const units = [
    { label: 'y', seconds: 60 * 60 * 24 * 365 },
    { label: 'mo', seconds: 60 * 60 * 24 * 30 },
    { label: 'd', seconds: 60 * 60 * 24 },
    { label: 'h', seconds: 60 * 60 },
    { label: 'm', seconds: 60 },
    { label: 's', seconds: 1 }
  ];

  const parts: string[] = [];
  let remaining = diffSeconds;

  for (const unit of units) {
    if (remaining <= 0) break;
    const value = Math.floor(remaining / unit.seconds);
    if (value > 0) {
      parts.push(`${value}${unit.label}`);
      remaining -= value * unit.seconds;
    }
    if (parts.length === 2) break; // keep it concise
  }

  if (parts.length === 0) {
    return '0s';
  }

  return parts.join(' ');
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
