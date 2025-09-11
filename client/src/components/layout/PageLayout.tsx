import React from 'react';
import { AppHeader } from './AppHeader';
import { BottomNavigation } from '../navigation/BottomNavigation';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  className?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  title,
  subtitle,
  rightSlot,
  showBackButton = false,
  onBackClick,
  className = ''
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader
        title={title}
        subtitle={subtitle}
        rightSlot={rightSlot}
        showBackButton={showBackButton}
        onBackClick={onBackClick}
      />
      
      <main className="flex-1 overflow-y-auto pb-16">
        <div className={className}>
          {children}
        </div>
      </main>
      
      <BottomNavigation />
    </div>
  );
};
