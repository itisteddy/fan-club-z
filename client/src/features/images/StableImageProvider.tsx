/**
 * Stable Image Provider for Prediction Cards
 * 
 * Ensures:
 * 1. Images are contextual to prediction title + category
 * 2. Once assigned, images never change for a prediction (stored in DB)
 * 3. Primary provider (Pexels) with automatic fallback to backup (Unsplash)
 * 4. No flickering - image is locked once loaded
 * 
 * Priority order:
 * 1. Database image_url (permanent, never changes)
 * 2. IndexedDB cache (local persistence)
 * 3. Pexels API (primary provider)
 * 4. Unsplash API (fallback provider)
 * 5. Gradient fallback (if all else fails)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildImageQuery, generateSeed, sanitizeQuery } from './queries';
import { StockImage, imageCache } from './cache';
import type { Prediction } from './useAutoImage';
import { qaLog } from '../../utils/devQa';
import { getApiUrl } from '@/utils/environment';

const API_BASE = `${getApiUrl()}/api`;

/**
 * Save image URL to database for permanent storage
 * Only saves if not already set (prevents changing)
 */
async function saveImageToDatabase(predictionId: string, imageUrl: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/v2/predictions/${predictionId}/image`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl }),
    });
    
    if (response.ok) {
      qaLog(`[stable-image] Saved image to database for ${predictionId}`);
    }
  } catch (err) {
    // Non-critical - cache will still work
    qaLog(`[stable-image] Failed to save image to database:`, err);
  }
}

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

    // CRITICAL FIX: Images should be enabled by default
    // Only disable if explicitly set to 'false'
    const imagesEnabled = import.meta.env.VITE_IMAGES_FEATURE_FLAG !== 'false';
    if (!imagesEnabled) {
      setUsedFallback(true);
      setProvider('none');
      imageLocked.current = true;
      return;
    }

    fetchedRef.current = true;
    let cancelled = false;

    try {
      setLoading(true);
      setError(null);

      // Generate stable query and seed
      const query = sanitizeQuery(buildImageQuery(prediction));
      const seed = generateSeed(prediction);

      qaLog(`[stable-image] Fetching for prediction ${prediction.id}:`, {
        query,
        seed,
        title: prediction.title,
        category: prediction.category,
        dbImageUrl: prediction.image_url
      });

      // 0. PRIORITY: Check if prediction has image_url in database (permanent storage)
      if (prediction.image_url && !cancelled) {
        qaLog(`[stable-image] Using database image for ${prediction.id}: ${prediction.image_url.slice(0, 50)}...`);
        setImage({
          id: `db-${prediction.id}`,
          url: prediction.image_url,
          width: 800,
          height: 600,
          alt: prediction.title,
          photographer: '',
          photographerUrl: '',
          provider: 'database'
        } as StockImage);
        setProvider('pexels'); // Treat as primary provider
        imageLocked.current = true;
        setLoading(false);
        return;
      }

      // 1. Check cache for Pexels first
      const cachedPexels = await imageCache.get(prediction.id, 'pexels', seed);
      if (cachedPexels && !cancelled) {
        qaLog(`[stable-image] Using cached Pexels image for ${prediction.id}`);
        setImage(cachedPexels);
        setProvider('pexels');
        imageLocked.current = true;
        setLoading(false);
        // Save to database for permanent storage (non-blocking)
        if (cachedPexels.url) {
          saveImageToDatabase(prediction.id, cachedPexels.url);
        }
        return;
      }

      // 2. Check cache for Unsplash
      const cachedUnsplash = await imageCache.get(prediction.id, 'unsplash', seed);
      if (cachedUnsplash && !cancelled) {
        qaLog(`[stable-image] Using cached Unsplash image for ${prediction.id}`);
        setImage(cachedUnsplash);
        setProvider('unsplash');
        setUsedFallback(true);
        imageLocked.current = true;
        setLoading(false);
        // Save to database for permanent storage (non-blocking)
        if (cachedUnsplash.url) {
          saveImageToDatabase(prediction.id, cachedUnsplash.url);
        }
        return;
      }

      // 3. Try Pexels (primary provider)
      const pexelsImage = await fetchFromProvider('pexels', query, seed);
      if (pexelsImage && !cancelled) {
        qaLog(`[stable-image] Got Pexels image for ${prediction.id}`);
        setImage(pexelsImage);
        setProvider('pexels');
        await imageCache.set(prediction.id, 'pexels', seed, pexelsImage);
        imageLocked.current = true;
        setLoading(false);
        // Save to database for permanent storage (non-blocking)
        if (pexelsImage.url) {
          saveImageToDatabase(prediction.id, pexelsImage.url);
        }
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
        await imageCache.set(prediction.id, 'unsplash', seed, unsplashImage);
        imageLocked.current = true;
        setLoading(false);
        // Save to database for permanent storage (non-blocking)
        if (unsplashImage.url) {
          saveImageToDatabase(prediction.id, unsplashImage.url);
        }
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

        // PERFORMANCE FIX: Reduced timeout to prevent hanging
        const response = await fetch(`${API_BASE}/images?${params}`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout (reduced from 10s)
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

  // CRITICAL FIX: Fetch images immediately - don't delay with idle callback
  // Images are essential for UX and should load as soon as possible
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

