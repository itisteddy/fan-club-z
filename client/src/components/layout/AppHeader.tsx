import React from 'react';
import { cn } from '../../utils/cn';

type AppHeaderProps = {
  title?: string;                // e.g., "Discover", "My Bets", "Wallet"
  subtitle?: string;             // optional short helper
  left?: React.ReactNode;        // usually Back button or nothing on root tabs
  right?: React.ReactNode;       // icon CTAs (Share, …) or empty
  action?: React.ReactNode;      // alias for right (back-compat)
  sticky?: boolean;              // default true
};

export function AppHeader({ title, subtitle, left, right, action, sticky = true }: AppHeaderProps) {
  const trailing = right ?? action ?? null;
  return (
    <header className={cn(
      "w-full z-20 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
      sticky && "sticky top-0"
    )}>
      <div className="safe-px mx-auto max-w-screen-md">
        <div className="h-12 flex items-center justify-between gap-2 px-4">
          <div className="min-w-[40px] flex items-center">{left ?? null}</div>
          <div className="flex-1 text-center">
            {title && <h1 className="text-base font-semibold leading-none truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
          <div className="min-w-[40px] flex items-center justify-end gap-1">{trailing}</div>
        </div>
      </div>
      <div className="border-b border-gray-200" />
    </header>
  );
}

export default AppHeader;
