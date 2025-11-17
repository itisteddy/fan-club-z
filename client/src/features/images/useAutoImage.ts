import { useState, useEffect } from 'react';
import { StockImage, imageCache } from './cache';
import { buildImageQuery, generateSeed, sanitizeQuery } from './queries';
import { selectImage } from './select';
import { qaLog } from '../../utils/devQa';
import { getApiUrl } from '@/utils/environment';

export interface Prediction {
  id: string;
  title: string;
  category?: string;
  description?: string;
  slug?: string;
}

export interface UseAutoImageOptions {
  prediction: Prediction;
  provider?: 'pexels' | 'unsplash' | 'none';
  enabled?: boolean;
}

export interface UseAutoImageResult {
  image: StockImage | null;
  loading: boolean;
  error: string | null;
  fallback: boolean;
}

const API_BASE = `${getApiUrl()}/api`;

export function useAutoImage({
  prediction,
  provider = 'pexels',
  enabled = true
}: UseAutoImageOptions): UseAutoImageResult {
  const [image, setImage] = useState<StockImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    // Check if images are enabled
    const imagesEnabled = import.meta.env.VITE_IMAGES_FEATURE_FLAG === 'true';
    if (!enabled || !imagesEnabled || provider === 'none') {
      setFallback(true);
      return;
    }

    let cancelled = false;

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        setFallback(false);

        // Generate query and seed
        const query = sanitizeQuery(buildImageQuery(prediction));
        const seed = generateSeed(prediction);

        qaLog(`[images] Fetching image for prediction ${prediction.id}:`, {
          query,
          seed,
          provider
        });

        // Check cache first
        const cachedImage = await imageCache.get(prediction.id, provider, seed);
        if (cachedImage && !cancelled) {
          qaLog(`[images] Using cached image for prediction ${prediction.id}`);
          setImage(cachedImage);
          setLoading(false);
          return;
        }

        // Fetch from API
        const params = new URLSearchParams({
          q: query,
          seed,
          provider,
          take: '1'
        });

        const response = await fetch(`${API_BASE}/images?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.success && data.images && data.images.length > 0) {
          const selectedImage = selectImage<StockImage>(data.images as StockImage[], seed);
          
          if (selectedImage) {
            qaLog(`[images] Got image for prediction ${prediction.id}:`, selectedImage);
            setImage(selectedImage);
            
            // Cache the result
            await imageCache.set(prediction.id, provider, seed, selectedImage);
          } else {
            qaLog(`[images] No image selected for prediction ${prediction.id}`);
            setFallback(true);
          }
        } else {
          qaLog(`[images] No images found for prediction ${prediction.id}`);
          setFallback(true);
        }

      } catch (err) {
        if (cancelled) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        qaLog(`[images] Error fetching image for prediction ${prediction.id}:`, errorMessage);
        
        setError(errorMessage);
        setFallback(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
    };
  }, [prediction.id, prediction.title, prediction.category, provider, enabled]);

  return {
    image,
    loading,
    error,
    fallback
  };
}
