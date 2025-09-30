# Quick Reference: Prediction Media

## TL;DR - Copy & Paste

### Basic Usage

```tsx
import { usePredictionMedia } from '@/lib/media';

function YourComponent({ prediction }) {
  const imageUrl = usePredictionMedia({
    id: prediction.id,
    title: prediction.title,
    category: prediction.categorySlug
  });

  return (
    <div>
      {imageUrl ? (
        <img src={imageUrl} alt={prediction.title} />
      ) : (
        <div className="bg-gray-200">No image</div>
      )}
    </div>
  );
}
```

## Common Patterns

### Pattern 1: Card with Fallback

```tsx
const imageUrl = usePredictionMedia({ id, title, category });

<div className="card">
  {imageUrl ? (
    <img src={imageUrl} className="w-full h-48 object-cover" />
  ) : (
    <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600" />
  )}
</div>
```

### Pattern 2: With Loading State

```tsx
const imageUrl = usePredictionMedia({ id, title, category });
const [loaded, setLoaded] = useState(false);

<div className="relative">
  {!loaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}
  {imageUrl && (
    <img 
      src={imageUrl} 
      onLoad={() => setLoaded(true)}
      className={loaded ? 'opacity-100' : 'opacity-0'}
    />
  )}
</div>
```

### Pattern 3: List Item

```tsx
const imageUrl = usePredictionMedia({ id, title, category });

<div className="flex gap-4">
  <div className="w-16 h-16 rounded overflow-hidden">
    {imageUrl ? (
      <img src={imageUrl} className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full bg-gray-300" />
    )}
  </div>
  <div>{title}</div>
</div>
```

## Categories

Use these category strings for best results:

| Category | String | Query Additions |
|----------|--------|-----------------|
| Technology | `'tech'` | smartphone, gadget, product |
| Cryptocurrency | `'crypto'` | blockchain, bitcoin, digital |
| Sports | `'sports'` | stadium, action, game |
| Politics | `'politics'` | government, podium, flag |
| Finance | `'finance'` | stock market, trading, charts |
| Entertainment | `'entertainment'` | movies, cinema, hollywood |
| Science | `'science'` | laboratory, research, tech |

## Smart Queries

The query builder automatically detects context:

| User Input | What It Searches |
|------------|------------------|
| "Apple iPhone announcement" | iPhone smartphone (not fruit!) |
| "Bitcoin price prediction" | Bitcoin cryptocurrency |
| "NBA Finals winner" | Basketball game action |
| "Fed interest rate decision" | Central bank finance |

## Troubleshooting

### Images Not Loading?

```bash
# Check environment
echo $VITE_MEDIA_ENDPOINT
# Should be: /media/search

# Check Supabase
# Verify: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

# Check browser console
# Look for: CORS errors, 429 rate limits, fetch failures
```

### Card & Details Show Different Images?

```tsx
// ❌ DON'T: Use different IDs
<Card predictionId={prediction.id} />
<Details predictionId={prediction.uuid} />

// ✅ DO: Use exact same ID
<Card prediction={prediction} />
<Details prediction={prediction} />
```

### Images Too Slow?

```tsx
// Hook automatically caches:
// 1st call: ~300-500ms (API fetch)
// 2nd call: ~10ms (memory cache)
// Other device: ~50-100ms (DB cache)

// No action needed - it's automatic!
```

## Advanced Usage

### Custom Query (Bypass Smart Logic)

```tsx
// Use buildImageQuery directly
import { buildImageQuery } from '@/lib/media';

const customQuery = buildImageQuery('Your custom title', 'tech');
console.log(customQuery); // See what it generates
```

### Check Cache Status

```tsx
// The hook sets imageUrl to null initially
// Then updates when cache/API responds

useEffect(() => {
  if (imageUrl) {
    console.log('Image loaded:', imageUrl);
  }
}, [imageUrl]);
```

### Preload Images

```tsx
// The hook starts fetching immediately when mounted
// No manual preloading needed!

// But if you want to prefetch for later:
function PrefetchImage({ prediction }) {
  usePredictionMedia(prediction); // Just mount it
  return null; // Don't render anything
}
```

## Performance Tips

1. **Use in lists freely** - The hook is lightweight
2. **Don't worry about duplicates** - Cache handles it
3. **Images persist forever** - Until you clear the DB
4. **Memory efficient** - Only stores URLs, not image data

## Common Mistakes

### ❌ Don't Do This

```tsx
// Creating new objects every render
usePredictionMedia({
  id: prediction.id,
  title: prediction.title,
  category: getCategory() // Function call!
});

// Better: Memoize if needed
const category = useMemo(() => getCategory(), []);
usePredictionMedia({ id, title, category });
```

### ❌ Don't Do This

```tsx
// Using hook conditionally
if (showImage) {
  const imageUrl = usePredictionMedia(...); // ❌ Breaks rules of hooks
}

// Better:
const imageUrl = usePredictionMedia(...);
return showImage && imageUrl ? <img ... /> : null;
```

### ✅ Do This

```tsx
// Clean, simple, works everywhere
const imageUrl = usePredictionMedia({ id, title, category });
```

## Files Reference

| File | Purpose |
|------|---------|
| `buildQuery.ts` | Smart query builder |
| `usePredictionMedia.ts` | Main hook (use this!) |
| `index.ts` | Clean exports |
| `examples.tsx` | Full component examples |
| `IMPLEMENTATION_GUIDE.md` | Full setup docs |
| `MIGRATION_CHECKLIST.md` | Step-by-step migration |
| `prediction_media.sql` | Database setup |

## Need Help?

1. Check `examples.tsx` for full component code
2. Read `IMPLEMENTATION_GUIDE.md` for detailed setup
3. Follow `MIGRATION_CHECKLIST.md` for safe migration
4. Test queries with `buildQuery.test.ts`

---

**Remember:** The hook handles everything automatically.  
Just pass prediction data and render the imageUrl! 🎉
