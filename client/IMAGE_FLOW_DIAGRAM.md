# Image Provider Flow Diagram

## Before (Old System - Flickering Issues)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PredictionCard Component                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         useAutoImage Hook (on every render)             │   │
│  │                                                          │   │
│  │  1. Fetch from provider (Pexels OR Unsplash)           │   │
│  │  2. No image locking                                    │   │
│  │  3. Query: category only → "tech"                       │   │
│  │  4. Different images on each fetch                      │   │
│  │  5. Image can change during component lifecycle         │   │
│  └────────────────────────────────────────────────────────┘   │
│                              ↓                                   │
│                    ❌ FLICKERING ISSUE                           │
│                    ❌ Non-contextual images                      │
│                    ❌ No fallback strategy                       │
└─────────────────────────────────────────────────────────────────┘
```

## After (New System - Stable & Contextual)

```
┌──────────────────────────────────────────────────────────────────────┐
│                      PredictionCard Component                         │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │           useStableImage Hook (with locking)                  │  │
│  │                                                                │  │
│  │  Step 1: Check if image already locked                        │  │
│  │          └─→ YES: Return cached image ✅                      │  │
│  │          └─→ NO: Continue to Step 2                           │  │
│  │                                                                │  │
│  │  Step 2: Build contextual query                               │  │
│  │          Title: "Lakers Championship Prediction"              │  │
│  │          Category: "Sports"                                    │  │
│  │          Result: "lakers championship sports" ✅              │  │
│  │                                                                │  │
│  │  Step 3: Check caches                                          │  │
│  │          ┌─→ Memory Cache → Found? Return & Lock ✅          │  │
│  │          ├─→ IndexedDB Cache → Found? Return & Lock ✅        │  │
│  │          └─→ Not Found? Continue to Step 4                    │  │
│  │                                                                │  │
│  │  Step 4: Fetch from PRIMARY provider (Pexels)                 │  │
│  │          ┌─→ Success? Cache, Lock & Return ✅                 │  │
│  │          └─→ Failed? Continue to Step 5                       │  │
│  │                                                                │  │
│  │  Step 5: Fetch from BACKUP provider (Unsplash)                │  │
│  │          ┌─→ Success? Cache, Lock & Return ✅                 │  │
│  │          └─→ Failed? Continue to Step 6                       │  │
│  │                                                                │  │
│  │  Step 6: Use gradient fallback based on category ✅           │  │
│  │          Lock to prevent further attempts                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↓                                        │
│                    ✅ NO FLICKERING                                   │
│                    ✅ Contextual to title + category                 │
│                    ✅ Automatic fallback chain                        │
│                    ✅ Aggressive caching                              │
└──────────────────────────────────────────────────────────────────────┘
```

## Image Locking Mechanism

```typescript
// Image lock prevents any changes once loaded
const imageLocked = useRef(false);
const fetchedRef = useRef(false);

// Once set, this NEVER changes for this prediction
if (imageLocked.current) {
  return cachedImage; // ← Always returns same image
}

// After successful load:
imageLocked.current = true; // ← Lock permanently
```

## Query Building Strategy

### Old (Category Only)
```
Input:  "Will the Lakers win the Championship?"
        Category: "Sports"
Output: "sports"
Result: Generic sports images ❌
```

### New (Title + Category)
```
Input:  "Will the Lakers win the Championship?"
        Category: "Sports"
        
Process:
1. Extract keywords: ["lakers", "win", "championship"]
2. Remove stopwords: ["lakers", "championship"]
3. Get category keyword: "sports"
4. Combine: "lakers championship sports"

Result: Specific Lakers/basketball images ✅
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────┐
│                 Image Cache Layers                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Layer 1: Memory Cache (useRef)                     │
│  ├─ Fastest access                                  │
│  ├─ Lost on component unmount                       │
│  └─ Prevents flicker during scrolling               │
│                                                      │
│  Layer 2: IndexedDB Cache (imageCache)              │
│  ├─ Persists across sessions                        │
│  ├─ Keyed by: predictionId + provider + seed        │
│  └─ 10MB+ storage capacity                          │
│                                                      │
│  Layer 3: Network (Pexels/Unsplash)                 │
│  ├─ Only hit on cache miss                          │
│  ├─ Primary: Pexels API                             │
│  └─ Backup: Unsplash API                            │
│                                                      │
│  Layer 4: Gradient Fallback                         │
│  ├─ Always available                                │
│  ├─ Category-themed colors                          │
│  └─ No network required                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

## Performance Comparison

### Old System
```
Prediction Card Render:
├─ Component mounts
├─ useAutoImage hook runs
├─ Network request → 300-1000ms
├─ Image loads
├─ Component re-renders (scroll, state change)
├─ useAutoImage runs AGAIN ❌
└─ Different image fetched ❌
    └─ Flicker! ❌
```

### New System
```
Prediction Card Render:
├─ Component mounts
├─ useStableImage hook runs
├─ Check lock → Not locked
├─ Check memory cache → Not found
├─ Check IndexedDB → Not found
├─ Network request (Pexels) → 300-1000ms
├─ Image loads & LOCKS ✅
├─ Store in both caches
├─ Component re-renders (scroll, state change)
├─ useStableImage runs AGAIN
└─ Check lock → LOCKED ✅
    └─ Return cached image instantly ✅
        └─ NO network request! ✅
            └─ Same image! ✅
```

## User Experience Improvements

```
Old Experience:
User scrolls down
  └─→ Cards enter viewport
      └─→ Images load (spinner)
          └─→ Image appears
              └─→ User scrolls up
                  └─→ Same card re-renders
                      └─→ DIFFERENT IMAGE ❌
                          └─→ User confused 😕

New Experience:
User scrolls down
  └─→ Cards enter viewport
      └─→ Images load (spinner)
          └─→ Image appears & LOCKS
              └─→ User scrolls up
                  └─→ Same card re-renders
                      └─→ SAME IMAGE ✅ (instant!)
                          └─→ User happy 😊
```

## Technical Implementation

### AutoImage Component Flow
```typescript
export const AutoImage: React.FC<AutoImageProps> = ({
  prediction,
  aspect,
  ...props
}) => {
  // Step 1: Use stable image hook
  const { image, loading, usedFallback } = useStableImage({
    prediction,
    enabled: true
  });

  // Step 2: If no image, show gradient fallback
  if (usedFallback || !image) {
    return <GradientFallback category={prediction.category} />;
  }

  // Step 3: Show actual image (locked, won't change)
  return (
    <img 
      src={image.url} 
      alt={prediction.title}
      // Image is now stable - won't change! ✅
    />
  );
};
```

### StableImageProvider Logic
```typescript
export function useStableImage({ prediction }) {
  const imageLocked = useRef(false);
  
  useEffect(() => {
    // Don't fetch if locked
    if (imageLocked.current) return;
    
    const fetchImage = async () => {
      // 1. Check caches
      const cached = await checkCaches(prediction.id);
      if (cached) {
        setImage(cached);
        imageLocked.current = true; // ← Lock!
        return;
      }
      
      // 2. Try Pexels
      const pexelsImage = await fetchPexels(query);
      if (pexelsImage) {
        setImage(pexelsImage);
        imageLocked.current = true; // ← Lock!
        return;
      }
      
      // 3. Try Unsplash (backup)
      const unsplashImage = await fetchUnsplash(query);
      if (unsplashImage) {
        setImage(unsplashImage);
        imageLocked.current = true; // ← Lock!
        return;
      }
      
      // 4. Use gradient
      setUsedFallback(true);
      imageLocked.current = true; // ← Lock even on fallback!
    };
    
    fetchImage();
  }, [prediction.id]);
  
  return { image, loading, usedFallback };
}
```

## Benefits Summary

| Aspect | Old System | New System |
|--------|------------|------------|
| **Flickering** | Yes ❌ | None ✅ |
| **Contextual** | No (category only) ❌ | Yes (title + category) ✅ |
| **Fallback** | Single provider ❌ | Primary + Backup + Gradient ✅ |
| **Caching** | Basic ⚠️ | Multi-layer ✅ |
| **Stability** | Images can change ❌ | Locked forever ✅ |
| **Network Requests** | Multiple per card ❌ | Once per card ✅ |
| **UX** | Confusing ❌ | Smooth ✅ |

