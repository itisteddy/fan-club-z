// src/components/ui/ImageThumb.tsx
import React, { useState } from 'react';

type Props = {
  seed: string;           // e.g., prediction.id or a stable hash
  size?: number;          // px, square
  alt?: string;
  className?: string;
};

/**
 * Deterministic, cache-friendly thumbnail:
 * - Uses picsum.photos seeded URL (no API key, stable per seed)
 * - Lazy-loads, shows skeleton, falls back to gradient on error
 * - Fixed dimensions -> no layout shift
 */
export default function ImageThumb({ seed, size = 96, alt = '', className = '' }: Props) {
  const [errored, setErrored] = useState(false);
  const src = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${size}/${size}`;

  return (
    <div
      className={`relative shrink-0 rounded-xl overflow-hidden border border-black/5 bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={alt ? undefined : true}
    >
      {!errored ? (
        <img
          loading="lazy"
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200" />
      )}
    </div>
  );
}
