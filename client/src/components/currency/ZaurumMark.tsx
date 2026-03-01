import React from 'react';
import { cn } from '@/utils/cn';

interface ZaurumMarkProps {
  className?: string;
  title?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE_CLASS: Record<NonNullable<ZaurumMarkProps['size']>, string> = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-7 w-7',
};

export function ZaurumMark({ className, title = 'Zaurum', size = 'md' }: ZaurumMarkProps) {
  return (
    <img
      src="/assets/zaurum-mark.png"
      alt={title}
      title={title}
      className={cn(
        'inline-block align-middle shrink-0 select-none object-contain drop-shadow-[0_0_1px_rgba(245,158,11,0.55)]',
        SIZE_CLASS[size],
        className
      )}
      loading="eager"
      decoding="async"
    />
  );
}

export default ZaurumMark;
