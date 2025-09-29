import * as React from 'react';

type ThumbProps = {
  src?: string | null;
  alt?: string;
  width?: number;  // px
  height?: number; // px
  className?: string;
  rounded?: boolean;
};

export function Thumb({
  src,
  alt = '',
  width = 88,
  height = 88,
  className = '',
  rounded = true
}: ThumbProps) {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div
      className={`relative overflow-hidden ${rounded ? 'rounded-xl' : ''} ${className}`}
      style={{ width, height, minWidth: width, minHeight: height, background: 'var(--surface-2,#f2f3f5)' }}
      aria-hidden={alt ? undefined : true}
    >
      {/* Blur-up placeholder */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'linear-gradient(135deg,#eceff3,#e7ebf0)' }}
      />
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      ) : null}
    </div>
  );
}
