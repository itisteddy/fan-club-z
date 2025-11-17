import React, { useState, useCallback } from 'react';
import { useStableImage } from './StableImageProvider';
import type { Prediction } from './useAutoImage';
import { cn } from '../../utils/cn';

export interface AutoImageProps {
  prediction: Prediction;
  aspect?: '16/9' | '4/3' | '1/1' | '3/2';
  priority?: boolean;
  className?: string;
  rounded?: 'lg' | 'xl' | '2xl';
  showFallback?: boolean;
}

// Generate gradient fallback based on prediction category
function getCategoryGradient(category?: string): string {
  const gradients: Record<string, string> = {
    tech: 'from-blue-500 to-purple-600',
    technology: 'from-blue-500 to-purple-600',
    sports: 'from-green-500 to-emerald-600',
    crypto: 'from-yellow-500 to-orange-600',
    cryptocurrency: 'from-yellow-500 to-orange-600',
    politics: 'from-red-500 to-pink-600',
    business: 'from-gray-500 to-slate-600',
    entertainment: 'from-pink-500 to-rose-600',
    science: 'from-teal-500 to-cyan-600',
    health: 'from-emerald-500 to-green-600',
    finance: 'from-indigo-500 to-blue-600',
    education: 'from-violet-500 to-purple-600',
    travel: 'from-sky-500 to-blue-600',
    food: 'from-orange-500 to-red-600',
    fashion: 'from-purple-500 to-pink-600',
    art: 'from-pink-500 to-purple-600',
    music: 'from-purple-500 to-indigo-600',
    gaming: 'from-green-500 to-teal-600',
    automotive: 'from-gray-500 to-zinc-600',
    real_estate: 'from-stone-500 to-gray-600'
  };

  return gradients[category?.toLowerCase() || ''] || 'from-gray-400 to-gray-600';
}

// Generate alt text from prediction title
function generateAltText(prediction: Prediction): string {
  const title = prediction.title.slice(0, 120); // Truncate to 120 chars
  return `Image related to: ${title}`;
}

export const AutoImage: React.FC<AutoImageProps> = ({
  prediction,
  aspect = '16/9',
  priority = false,
  className = '',
  rounded = 'xl',
  showFallback = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Use stable image provider for contextual, non-flickering images
  const { image, loading, error, usedFallback } = useStableImage({
    prediction,
    enabled: true
  });

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  // Determine aspect ratio class
  const aspectClass = {
    '16/9': 'aspect-[16/9]',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
    '3/2': 'aspect-[3/2]'
  }[aspect];

  // Determine rounded class
  const roundedClass = {
    'lg': 'rounded-lg',
    'xl': 'rounded-xl',
    '2xl': 'rounded-2xl'
  }[rounded];

  // Show fallback if error or explicitly requested
  const shouldShowFallback = (usedFallback && !image) || error || imageError || (!showFallback && !image);

  // Get gradient for loading/fallback states
  const gradientClass = getCategoryGradient(prediction.category);

  return (
    <div 
      className={cn(
        'relative overflow-hidden',
        aspectClass,
        roundedClass,
        className
      )}
    >
      {/* Loading skeleton - always show when loading or no image yet */}
      {(loading || !image) && !imageLoaded && !shouldShowFallback && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Fallback gradient - show when error or no image available */}
      {shouldShowFallback && showFallback && (
        <div 
          className={cn(
            'absolute inset-0 bg-gradient-to-br',
            gradientClass
          )}
          role="img"
          aria-label={generateAltText(prediction)}
        >
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 bg-black/10" />
          
          {/* Category icon or text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/80 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm font-medium capitalize">
                {prediction.category || 'Prediction'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview image (blur-up technique) - show immediately if available */}
      {image?.previewUrl && !imageLoaded && (
        <img
          src={image.previewUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover filter blur-sm scale-110 opacity-60"
          aria-hidden="true"
          loading="eager"
        />
      )}

      {/* Main image - fade in smoothly when loaded */}
      {image && !shouldShowFallback && (
        <>
          <img
            src={image.url}
            alt={generateAltText(prediction)}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
            sizes={
              aspect === '16/9' 
                ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                : '(max-width: 640px) 100vw, (max-width: 1024px) 25vw, 20vw'
            }
          />
          
          {/* Gradient overlay for text contrast (only when image is loaded) */}
          {imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent pointer-events-none" />
          )}
        </>
      )}
    </div>
  );
};
