import React from 'react';
import { cn } from '../../../utils/cn';

interface SubnavProps {
  children: React.ReactNode;
  className?: string;
}

export function Subnav({ children, className }: SubnavProps) {
  return (
    <div
      className={cn(
        // Base styling
        'border-b border-gray-100 bg-white',
        // Padding
        'px-4 md:px-6 py-2',
        // Typography
        'text-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export default Subnav;
