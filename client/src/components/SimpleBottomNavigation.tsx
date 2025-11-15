import React from 'react';
import { cn } from '@/utils/cn';

type NavItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

interface SimpleBottomNavigationProps {
  items?: NavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

const DEFAULT_ITEMS: NavItem[] = [
  { id: 'discover', label: 'Discover' },
  { id: 'predictions', label: 'Predictions' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'profile', label: 'Profile' },
];

export default function SimpleBottomNavigation({
  items = DEFAULT_ITEMS,
  activeId,
  onSelect,
  className,
}: SimpleBottomNavigationProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-lg z-30',
        'flex items-center justify-around py-3',
        className
      )}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item.id)}
            className={cn(
              'flex flex-col items-center text-xs font-medium transition-colors',
              isActive ? 'text-emerald-600' : 'text-gray-500'
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

