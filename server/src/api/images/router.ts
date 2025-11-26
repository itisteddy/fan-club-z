import express from 'express';
import crypto from 'crypto';
import { PexelsProvider } from './pexels';
import { UnsplashProvider } from './unsplash';
import { imageCache } from './cache';
import { StockImage } from './types';

const router = express.Router();

// [PERF] Helper to generate ETag from response data
function generateETag(data: unknown): string {
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

// Initialize providers based on environment variables
// CRITICAL: Server needs PEXELS_API_KEY and UNSPLASH_ACCESS_KEY env vars
const pexelsApiKey = process.env.PEXELS_API_KEY;
const unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;

const pexelsProvider = pexelsApiKey 
  ? new PexelsProvider(pexelsApiKey)
  : null;

const unsplashProvider = unsplashApiKey 
  ? new UnsplashProvider(unsplashApiKey)
  : null;

// Log provider status on startup
console.log('[Images API] Provider status:', {
  pexels: pexelsProvider ? '✅ Available' : '❌ Missing PEXELS_API_KEY',
  unsplash: unsplashProvider ? '✅ Available' : '❌ Missing UNSPLASH_ACCESS_KEY'
});

// Seeded index function for deterministic selection
function seededIndex(seed: string, len: number): number {
  let h = 2166136261; // FNV-1a hash
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h) % Math.max(1, len);
}

// GET /api/images?q=<query>&seed=<hash>&take=10&provider=pexels
router.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;
    const seed = req.query.seed as string;
    const take = parseInt(req.query.take as string) || 10;
    const provider = (req.query.provider as string) || 'pexels';

    // Validate required parameters
    if (!query || !seed) {
      return res.status(400).json({
        error: 'Missing required parameters: q (query) and seed are required'
      });
    }

    // Validate provider
    if (provider !== 'pexels' && provider !== 'unsplash') {
      return res.status(400).json({
        error: 'Invalid provider. Must be "pexels" or "unsplash"'
      });
    }

    // Check cache first
    const cachedImages = imageCache.get(query, seed, provider);
    if (cachedImages && cachedImages.length > 0) {
      const selectedIndex = seededIndex(seed, cachedImages.length);
      const selectedImages = cachedImages.slice(0, take);
      
      const response = {
        success: true,
        images: selectedImages,
        selectedIndex,
        cached: true,
        provider
      };

      // [PERF] ETag support for cached responses
      const etag = generateETag(response);
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      
      // Check if client has cached version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      return res.json(response);
    }

    // Get the appropriate provider
    let imageProvider = null;
    if (provider === 'pexels' && pexelsProvider) {
      imageProvider = pexelsProvider;
    } else if (provider === 'unsplash' && unsplashProvider) {
      imageProvider = unsplashProvider;
    }

    if (!imageProvider) {
      console.error(`[Images API] Provider ${provider} not available:`, {
        pexelsAvailable: !!pexelsProvider,
        unsplashAvailable: !!unsplashProvider,
        requestedProvider: provider
      });
      return res.status(503).json({
        error: `${provider} provider not available. Check API keys.`,
        fallback: true
      });
    }

    // Search for images
    const images = await imageProvider.search(query, {
      orientation: 'landscape',
      perPage: 20,
      safeSearch: process.env.IMAGES_SAFE_MODE !== 'false'
    });

    if (images.length === 0) {
      return res.json({
        success: true,
        images: [],
        selectedIndex: -1,
        provider,
        fallback: true
      });
    }

    // Cache the results
    imageCache.set(query, seed, provider, images);

    // Select images deterministically
    const selectedIndex = seededIndex(seed, images.length);
    const selectedImages = images.slice(0, take);

    const response = {
      success: true,
      images: selectedImages,
      selectedIndex,
      cached: false,
      provider
    };

    // [PERF] ETag support for fresh responses
    const etag = generateETag(response);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    
    // Check if client has cached version
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    return res.json(response);

  } catch (error) {
    console.error('Image API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      fallback: true
    });
  }
});

// GET /api/images/health - Health check endpoint
router.get('/health', (req, res) => {
  const stats = imageCache.getStats();
  
  return res.json({
    success: true,
    providers: {
      pexels: !!pexelsProvider,
      unsplash: !!unsplashProvider
    },
    cache: stats,
    environment: {
      safeMode: process.env.IMAGES_SAFE_MODE !== 'false',
      featureFlag: process.env.IMAGES_FEATURE_FLAG === 'true'
    }
  });
});

export default router;
