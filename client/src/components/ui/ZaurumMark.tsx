import React from 'react';
import { cn } from '@/utils/cn';

type ZaurumMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

export function ZaurumMark({ size = 12, className, title = 'Zaurum' }: ZaurumMarkProps) {
  return (
    <img
      src="/brand/zaurum-mark-pack2.png"
      alt={title}
      width={size}
      height={size}
      loading="lazy"
      className={cn('inline-block shrink-0 align-[-0.125em] rounded-[2px]', className)}
    />
  );
}

export default ZaurumMark;
