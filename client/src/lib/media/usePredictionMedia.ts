// Simplified media hook using direct Unsplash/Pexels calls with smart query building
import { useEffect, useState } from 'react';
import { buildImageQuery } from '@/lib/media/buildQuery';
import { createClient } from '@supabase/supabase-js';

const UNSPLASH_KEY = import.meta.env.VITE_MEDIA_UNSPLASH_KEY;
const PEXELS_KEY = import.meta.env.VITE_MEDIA_PEXELS_KEY;

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sb = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

type MediaResult = {
  url: string;
  alt: string;
  provider: string;
  status: 'loading' | 'ready' | 'error';
};

const memory = new Map<string, string | null>();

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
  const seed = hashSeed(id);
  const pool = FALLBACKS[category || ''] || FALLBACKS.general;
  return pool[seed % pool.length];
}

export function usePredictionMedia(prediction: {
  id: string;
  title: string;
  category?: string;
}): MediaResult {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    const { id, title, category } = prediction;
    
    if (!id || !title) {
      setUrl(getFallback(id, category));
      setStatus('ready');
      return;
    }

    (async () => {
      // 1) Memory cache
      if (memory.has(id)) {
        const cached = memory.get(id);
        if (!cancelled) {
          setUrl(cached || getFallback(id, category));
          setStatus('ready');
        }
        return;
      }

      // 2) DB cache
      const dbUrl = await getCached(id);
      if (cancelled) return;
      
      if (dbUrl) {
        memory.set(id, dbUrl);
        setUrl(dbUrl);
        setStatus('ready');
        return;
      }

      // 3) Build smart query & search
      const query = buildImageQuery(title, category);
      
      // Try Unsplash first, then Pexels
      let fetched = await searchUnsplash(query);
      if (!fetched) fetched = await searchPexels(query);
      
      if (cancelled) return;

      // 4) Store & set
      const finalUrl = fetched || getFallback(id, category);
      memory.set(id, fetched);
      setUrl(finalUrl);
      setStatus('ready');
      
      // Cache in background (don't await)
      setCached(id, fetched, query);
    })();

    return () => { cancelled = true; };
  }, [prediction.id, prediction.title, prediction.category]);

  return {
    url: url || getFallback(prediction.id, prediction.category),
    alt: prediction.title,
    provider: url ? 'api' : 'fallback',
    status,
  };
}
