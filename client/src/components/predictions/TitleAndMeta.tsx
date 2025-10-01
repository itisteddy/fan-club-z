import React from 'react';
import CreatorByline from './CreatorByline';
import type { CreatorInfo } from './CreatorByline';

interface TitleAndMetaProps {
  title: string;
  creator?: CreatorInfo;
  className?: string;
}

/**
 * Compact title and creator display
 * Replaces large heading blocks with tight, predictable spacing
 */
export function TitleAndMeta({ title, creator, className = '' }: TitleAndMetaProps) {
  return (
    <header className={`space-y-2 ${className}`}>
      <h1 className="text-2xl font-bold leading-snug text-gray-900">
        {title}
      </h1>
      <CreatorByline creator={creator} />
    </header>
  );
}

