import express from 'express';
import { PexelsProvider } from './pexels';
import { UnsplashProvider } from './unsplash';
import { imageCache } from './cache';
import { StockImage } from './types';

const router = express.Router();

// Initialize providers based on environment variables
const pexelsProvider = process.env.PEXELS_API_KEY 
  ? new PexelsProvider(process.env.PEXELS_API_KEY)
  : null;

const unsplashProvider = process.env.UNSPLASH_ACCESS_KEY 
  ? new UnsplashProvider(process.env.UNSPLASH_ACCESS_KEY)
  : null;

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
      
      return res.json({
        success: true,
        images: selectedImages,
        selectedIndex,
        cached: true,
        provider
      });
    }

    // Get the appropriate provider
    let imageProvider = null;
    if (provider === 'pexels' && pexelsProvider) {
      imageProvider = pexelsProvider;
    } else if (provider === 'unsplash' && unsplashProvider) {
      imageProvider = unsplashProvider;
    }

    if (!imageProvider) {
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

    return res.json({
      success: true,
      images: selectedImages,
      selectedIndex,
      cached: false,
      provider
    });

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
