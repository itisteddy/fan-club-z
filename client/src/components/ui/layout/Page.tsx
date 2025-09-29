import React from 'react';
import { cn } from '../../../utils/cn';

type PageProps = {
  children: React.ReactNode;
  className?: string;
};

export function Page({ children, className }: PageProps) {
  return (
    <div 
      className={cn(
        // Container max-width: 720px mobile/portrait; 960px larger screens
        'mx-auto w-full max-w-[720px] lg:max-w-[960px]',
        // Horizontal gutters: 16px mobile, 24px ≥768px
        'px-4 md:px-6',
        // Vertical rhythm: section gaps 16px mobile, 20px ≥768px
        'py-4 md:py-5',
        // Background
        'bg-gray-50 min-h-screen',
        className
      )}
    >
      <div className="space-y-4 md:space-y-5">
        {children}
      </div>
    </div>
  );
}

export default Page;
