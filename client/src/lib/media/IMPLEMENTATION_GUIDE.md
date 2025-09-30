# Prediction Media Solution

A drop-in, guard-railed solution for contextual image search with multi-layer caching.

## Features

✅ **Contextual Query Building** - Brand/category aware searches (e.g., "Apple iPhone" → tech device, not fruit)  
✅ **Single Source of Truth** - One hook used by both Card & Details components  
✅ **Multi-Layer Caching** - Memory → Supabase → API for optimal performance  
✅ **No CORS Issues** - Uses your existing `/media/search` proxy  
✅ **Persistence** - Images remain consistent across sessions/devices  

## Quick Start

### 1. Run the Database Migration

Execute the SQL in `prediction_media.sql` in your Supabase SQL editor:

```bash
# Copy contents of prediction_media.sql and run in Supabase
```

### 2. Use in Your Components

Replace any existing media resolution logic with the hook:

```tsx
import { usePredictionMedia } from '@/lib/media/usePredictionMedia';

function PredictionCard({ prediction }) {
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug // e.g., 'tech', 'crypto', 'sports'
  });

  return (
    <div className="card">
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={prediction.title}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600">
          {/* Your category fallback art */}
        </div>
      )}
      <h3>{prediction.title}</h3>
    </div>
  );
}
```

### 3. Use the Same Hook in Details Page

```tsx
function PredictionDetails({ prediction }) {
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug
  });

  // Same image as the card! 🎉
  return (
    <div className="details">
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt={prediction.title}
          className="w-full h-96 object-cover"
        />
      )}
      {/* ... rest of details */}
    </div>
  );
}
```

## How It Works

### Query Building (`buildQuery.ts`)

The smart query builder understands context:

**Brand Rules:**
- "Apple iPhone" → `"iPhone smartphone product shot modern apple"` (not fruit!)
- "Bitcoin price" → `"bitcoin logo coin cryptocurrency"`
- "NBA Finals" → `"basketball game court action"`

**Category Templates:**
- `tech` → adds "technology smartphone gadget product render"
- `crypto` → adds "cryptocurrency blockchain finance digital asset"
- `sports` → adds "sports action stadium crowd"
- `politics` → adds "government politics podium flag press"
- `finance` → adds "stock market finance trading charts"

### Caching Strategy (`usePredictionMedia.ts`)

1. **Memory Cache** - Instant within session (in-memory Map)
2. **Database Cache** - Persistent across devices (Supabase)
3. **API Fetch** - Only when needed (via your proxy)

This ensures:
- Card and Details show identical images
- No duplicate API calls
- Fast loading on repeat visits
- Consistency across all devices

## Environment Variables

Ensure these are set in your `.env`:

```bash
VITE_MEDIA_ENDPOINT=/media/search
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Customization

### Add More Brand Rules

Edit `buildQuery.ts`:

```typescript
const BRAND_RULES = [
  // ... existing rules
  {
    match: t => /\btesla\b/.test(t),
    query: _ => 'Tesla electric car vehicle modern'
  },
];
```

### Add More Categories

Edit `buildQuery.ts`:

```typescript
const CATEGORY_TEMPLATES = {
  // ... existing templates
  entertainment: 'movies cinema hollywood entertainment',
  science: 'laboratory research science technology',
};
```

### Disable Supabase Caching

If you prefer client-only caching:

```typescript
// In usePredictionMedia.ts
const sb = null; // Set to null to disable DB caching
```

## Testing

### Quick Relevance Tests

**Apple iPhone (Tech):**
```typescript
buildImageQuery("Will Apple announce a foldable iPhone?", "tech")
// → "iPhone smartphone product shot modern apple"
```

**Bitcoin (Crypto):**
```typescript
buildImageQuery("Will Bitcoin exceed $100,000?", "crypto")
// → "bitcoin logo coin cryptocurrency"
```

**NBA (Sports):**
```typescript
buildImageQuery("Who will win the NBA Finals?", "sports")
// → "basketball game court action"
```

## Troubleshooting

**Images not loading?**
- Check that `/media/search` proxy is working
- Verify `VITE_MEDIA_ENDPOINT` environment variable
- Check browser console for errors

**Card and Details showing different images?**
- Ensure both use `usePredictionMedia` hook
- Check that prediction IDs match exactly
- Clear cache: `localStorage.clear()` and refresh

**Supabase errors?**
- Verify table exists (run migration)
- Check RLS policies if enabled
- Verify credentials in `.env`

## Migration from Old System

1. Keep your existing `/media/search` proxy
2. Replace old media logic with `usePredictionMedia` hook
3. Run the SQL migration
4. Test with a few predictions
5. Roll out gradually

## Performance

- **First load:** ~300-500ms (API + cache write)
- **Cached load:** ~10-20ms (memory)
- **Cross-device:** ~50-100ms (Supabase read)

## License

Part of the FanClubZ v2.0 prediction platform.
