import React from 'react';
import { cn } from '@/utils/cn';

interface ZaurumMarkProps {
  className?: string;
  title?: string;
}

export function ZaurumMark({ className, title = 'Zaurum' }: ZaurumMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={cn('inline-block h-4 w-4 text-amber-500', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 10.5L7.5 5h9L20 10.5l-3 7H7l-3-7Z"
        fill="currentColor"
        opacity="0.2"
      />
      <path
        d="M4 10.5L7.5 5h9L20 10.5l-3 7H7l-3-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7.5 5 12 10.5 16.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M4 10.5h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default ZaurumMark;
