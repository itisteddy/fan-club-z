/**
 * Stable Image Provider for Prediction Cards
 * 
 * Ensures:
 * 1. Images are contextual to prediction title + category
 * 2. Once assigned, images never change for a prediction
 * 3. Primary provider (Pexels) with automatic fallback to backup (Unsplash)
 * 4. No flickering - image is locked once loaded
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildImageQuery, generateSeed, sanitizeQuery } from './queries';
import { StockImage, imageCache } from './cache';
import type { Prediction } from './useAutoImage';
import { qaLog } from '../../utils/devQa';
import { getApiUrl } from '@/utils/environment';

const API_BASE = `${getApiUrl()}/api`;

// Global memory cache shared across all component instances
// This prevents re-fetching the same image when components re-render
const globalMemoryCache = new Map<string, StockImage>();

export interface StableImageResult {
  image: StockImage | null;
  loading: boolean;
  error: string | null;
  usedFallback: boolean;
  provider: 'pexels' | 'unsplash' | 'none';
}

interface StableImageOptions {
  prediction: Prediction;
  enabled?: boolean;
}

/**
 * Stable image hook that ensures:
 * - Contextual images based on title + category
 * - Image stability (never changes once assigned)
 * - Automatic fallback from Pexels to Unsplash
 * - No flickering
 */
export function useStableImage({
  prediction,
  enabled = true
}: StableImageOptions): StableImageResult {
  const [image, setImage] = useState<StockImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [provider, setProvider] = useState<'pexels' | 'unsplash' | 'none'>('pexels');
  
  // Lock image once loaded to prevent any changes
  const imageLocked = useRef(false);
  const fetchedRef = useRef(false);

  // Reset locks when prediction changes
  useEffect(() => {
    imageLocked.current = false;
    fetchedRef.current = false;
  }, [prediction.id]);

  const fetchStableImage = useCallback(async () => {
    // Don't fetch if already locked or already fetching
    if (imageLocked.current || fetchedRef.current || !enabled) {
      return;
    }

    // Check if images are enabled globally
    const imagesEnabled = import.meta.env.VITE_IMAGES_FEATURE_FLAG === 'true';
    if (!imagesEnabled) {
      setUsedFallback(true);
      setProvider('none');
      imageLocked.current = true;
      return;
    }

    // Generate stable query and seed FIRST (before any async operations)
    const seed = generateSeed(prediction);
    const cacheKey = `${prediction.id}@${seed}`;

    // Check global memory cache FIRST (synchronous, instant)
    const memoryCached = globalMemoryCache.get(cacheKey);
    if (memoryCached) {
      qaLog(`[stable-image] Using global memory cache for ${prediction.id}`);
      setImage(memoryCached);
      setProvider(memoryCached.provider);
      imageLocked.current = true;
      setLoading(false);
      return;
    }

    // If we already have an image set, don't fetch again
    if (image) {
      imageLocked.current = true;
      return;
    }

    fetchedRef.current = true;
    let cancelled = false;

    try {
      setLoading(true);
      setError(null);

      const query = sanitizeQuery(buildImageQuery(prediction));

      qaLog(`[stable-image] Fetching for prediction ${prediction.id}:`, {
        query,
        seed,
        title: prediction.title,
        category: prediction.category
      });

      // 1. Check cache for Pexels first
      const cachedPexels = await imageCache.get(prediction.id, 'pexels', seed);
      if (cachedPexels && !cancelled) {
        qaLog(`[stable-image] Using cached Pexels image for ${prediction.id}`);
        setImage(cachedPexels);
        setProvider('pexels');
        globalMemoryCache.set(cacheKey, cachedPexels);
        imageLocked.current = true;
        setLoading(false);
        return;
      }

      // 2. Check cache for Unsplash
      const cachedUnsplash = await imageCache.get(prediction.id, 'unsplash', seed);
      if (cachedUnsplash && !cancelled) {
        qaLog(`[stable-image] Using cached Unsplash image for ${prediction.id}`);
        setImage(cachedUnsplash);
        setProvider('unsplash');
        setUsedFallback(true);
        globalMemoryCache.set(cacheKey, cachedUnsplash);
        imageLocked.current = true;
        setLoading(false);
        return;
      }

      // 3. Try Pexels (primary provider)
      const pexelsImage = await fetchFromProvider('pexels', query, seed);
      if (pexelsImage && !cancelled) {
        qaLog(`[stable-image] Got Pexels image for ${prediction.id}`);
        setImage(pexelsImage);
        setProvider('pexels');
        globalMemoryCache.set(cacheKey, pexelsImage);
        await imageCache.set(prediction.id, 'pexels', seed, pexelsImage);
        imageLocked.current = true;
        setLoading(false);
        return;
      }

      // 4. Fallback to Unsplash (backup provider)
      qaLog(`[stable-image] Pexels failed, trying Unsplash for ${prediction.id}`);
      const unsplashImage = await fetchFromProvider('unsplash', query, seed);
      if (unsplashImage && !cancelled) {
        qaLog(`[stable-image] Got Unsplash image for ${prediction.id}`);
        setImage(unsplashImage);
        setProvider('unsplash');
        setUsedFallback(true);
        globalMemoryCache.set(cacheKey, unsplashImage);
        await imageCache.set(prediction.id, 'unsplash', seed, unsplashImage);
        imageLocked.current = true;
        setLoading(false);
        return;
      }

      // 5. Both providers failed - use gradient fallback
      qaLog(`[stable-image] All providers failed for ${prediction.id}`);
      setUsedFallback(true);
      setProvider('none');
      imageLocked.current = true;

    } catch (err) {
      if (!cancelled) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        qaLog(`[stable-image] Error for ${prediction.id}:`, errorMessage);
        setError(errorMessage);
        setUsedFallback(true);
        setProvider('none');
        imageLocked.current = true;
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    async function fetchFromProvider(
      providerName: 'pexels' | 'unsplash',
      query: string,
      seed: string
    ): Promise<StockImage | null> {
      try {
        const params = new URLSearchParams({
          q: query,
          seed,
          provider: providerName,
          take: '1'
        });

        const response = await fetch(`${API_BASE}/images?${params}`, {
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.images && data.images.length > 0) {
          // Select first image (already filtered by seed on backend)
          return data.images[0] as StockImage;
        }

        return null;
      } catch (err) {
        qaLog(`[stable-image] ${providerName} fetch failed:`, err);
        return null;
      }
    }

    return () => {
      cancelled = true;
    };
  }, [prediction, enabled]);

  useEffect(() => {
    fetchStableImage();
  }, [fetchStableImage]);

  return {
    image,
    loading,
    error,
    usedFallback,
    provider
  };
}

