// Simplified media hook using direct Unsplash/Pexels calls with smart query building
import { useEffect, useState, useRef } from 'react';
import { buildImageQuery, type SemanticImageContext } from '@/lib/media/buildQuery';
import { createClient } from '@supabase/supabase-js';

const UNSPLASH_KEY = import.meta.env.VITE_MEDIA_UNSPLASH_KEY;
const PEXELS_KEY = import.meta.env.VITE_MEDIA_PEXELS_KEY;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { 
      auth: { 
        persistSession: false,
        detectSessionInUrl: false,
        storageKey: 'prediction-media-cache'
      } 
    })
  : null;

type MediaResult = {
  url: string;
  alt: string;
  provider: string;
  status: 'loading' | 'ready' | 'error';
};

type PredictionMedia = SemanticImageContext & {
  id: string;
  entryDeadline?: string | null;
};

// Global memory cache - persists across component instances
const memory = new Map<string, string>();

// Fallback images by category
const FALLBACKS: Record<string, string[]> = {
  tech: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475',
    'https://images.unsplash.com/photo-1510552776732-03e61cf4b144',
  ],
  crypto: [
    'https://images.unsplash.com/photo-1621416894569-0f39d71dbe8f',
    'https://images.unsplash.com/photo-1518544801976-3e4e4474c1ee',
  ],
  sports: [
    'https://images.unsplash.com/photo-1459865264687-595d652de67e',
    'https://images.unsplash.com/photo-1521417531630-0a222dda9bda',
  ],
  politics: [
    'https://images.unsplash.com/photo-1530036723598-68bd9f06e1d2',
  ],
  finance: [
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e',
  ],
  entertainment: [
    'https://images.unsplash.com/photo-1515165562835-c3b8c0b0b0d6',
  ],
  general: [
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  ],
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0);
}

async function searchUnsplash(query: string): Promise<string | null> {
  if (!UNSPLASH_KEY) return null;
  
  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '1');
    url.searchParams.set('orientation', 'landscape');
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    return json?.results?.[0]?.urls?.regular || null;
  } catch (error) {
    console.warn('[Unsplash] Search error:', error);
    return null;
  }
}

async function searchPexels(query: string): Promise<string | null> {
  if (!PEXELS_KEY) return null;
  
  try {
    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '1');
    url.searchParams.set('orientation', 'landscape');
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: PEXELS_KEY },
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    return json?.photos?.[0]?.src?.large || null;
  } catch (error) {
    console.warn('[Pexels] Search error:', error);
    return null;
  }
}

async function getCached(predictionId: string): Promise<string | null> {
  if (!sb) return null;
  
  try {
    const { data, error } = await sb
      .from('prediction_media')
      .select('image_url')
      .eq('prediction_id', predictionId)
      .maybeSingle();

    if (error) {
      console.warn('[Cache] Read error:', error.message);
      return null;
    }
    return data?.image_url ?? null;
  } catch (error) {
    console.warn('[Cache] Read exception:', error);
    return null;
  }
}

async function setCached(predictionId: string, url: string | null, query: string) {
  if (!sb) return;
  
  try {
    const { error } = await sb.from('prediction_media').upsert({
      prediction_id: predictionId,
      image_url: url,
      query,
      source: url ? 'api' : 'fallback',
    });
    
    if (error) {
      console.warn('[Cache] Write error:', error.message);
    }
  } catch (error) {
    console.warn('[Cache] Write exception:', error);
  }
}

function getFallback(id: string, category?: string): string {
  const seed = hashSeed(id || 'default');
  const normalizedCategory = category ? category.toLowerCase() : 'general';
  const fallbackPool = FALLBACKS.general;
  const poolCandidate = FALLBACKS[normalizedCategory] || fallbackPool;
  const pool: string[] =
    (poolCandidate && poolCandidate.length > 0 ? poolCandidate : fallbackPool) || [];
  if (pool.length === 0) {
    return 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee';
  }
  const index = Math.abs(seed) % pool.length;
  return pool[index] ?? pool[0] ?? 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee';
}

/**
 * Get the URL for a prediction, checking cache first.
 * This is the source of truth for image URLs.
 */
function getImageUrl(id: string, category?: string): string {
  // Memory cache is the source of truth
  const cached = memory.get(id);
  if (cached) return cached;
  
  // Return deterministic fallback
  return getFallback(id, category);
}

export function usePredictionMedia(prediction?: PredictionMedia): MediaResult {
  const predictionId = prediction?.id || '';
  const category = prediction?.category;
  
  // Track if we've started fetching to avoid duplicate requests
  const fetchingRef = useRef<string | null>(null);
  
  // Get initial URL from cache or fallback - this is synchronous and deterministic
  const initialUrl = getImageUrl(predictionId, category);
  
  const [url, setUrl] = useState<string>(initialUrl);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    memory.has(predictionId) ? 'ready' : 'loading'
  );

  useEffect(() => {
    // If no prediction, use fallback and mark ready
    if (!prediction || !prediction.id) {
      setUrl(getFallback('', 'general'));
      setStatus('ready');
      return;
    }
    
    const { id, title, category } = prediction;
    
    // If already in memory cache, just use it
    if (memory.has(id)) {
      const cached = memory.get(id)!;
      setUrl(cached);
      setStatus('ready');
      return;
    }
    
    // If we're already fetching this ID, don't start another fetch
    if (fetchingRef.current === id) {
      return;
    }
    
    // Mark as fetching
    fetchingRef.current = id;
    
    let cancelled = false;

    (async () => {
      // 1) Check DB cache first
      const dbUrl = await getCached(id);
      
      if (cancelled) return;
      
      if (dbUrl) {
        // Store in memory and update
        memory.set(id, dbUrl);
        setUrl(dbUrl);
        setStatus('ready');
        fetchingRef.current = null;
        return;
      }

      // 2) No cache - build query and search
      if (!title) {
        setStatus('ready');
        fetchingRef.current = null;
        return;
      }

      const query = buildImageQuery({
        title,
        category,
        description: prediction.description ?? prediction.question ?? '',
        question: prediction.question,
        tags: prediction.tags,
        options: prediction.options,
        entry_deadline: prediction.entry_deadline ?? prediction.entryDeadline ?? null,
        keywords: prediction.keywords,
        attributes: prediction.attributes,
        identity: prediction.identity,
        popularity: prediction.popularity,
      });
      
      // Try Pexels first (primary), then Unsplash as backup
      let fetched = await searchPexels(query);
      if (!fetched) fetched = await searchUnsplash(query);
      
      if (cancelled) return;

      // 3) Store result
      if (fetched) {
        memory.set(id, fetched);
        setUrl(fetched);
        // Cache in DB (don't await)
        setCached(id, fetched, query);
      }
      
      setStatus('ready');
      fetchingRef.current = null;
    })();

    return () => { 
      cancelled = true;
    };
  }, [predictionId]); // Only re-run when prediction ID changes

  return {
    url: url || getFallback(predictionId, category),
    alt: prediction?.title || '',
    provider: memory.has(predictionId) ? 'api' : 'fallback',
    status,
  };
}
