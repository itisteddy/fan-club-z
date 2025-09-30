# Quick Reference: UI Onboarding Media Fix

## What Was Changed

### 1. Category Chips (Shorter)
**Before**: `py-2` (variable height ~32-36px)  
**After**: `h-[28px]` (fixed 28px height)

**File**: `src/components/CategoryFilter.tsx`
```tsx
<button
  className={cn(
    'inline-flex items-center justify-center',
    'rounded-full border px-3',
    'h-[28px] text-xs leading-none', // ← NEW
    // ...
  )}
  data-tour="category-chips-item" // ← NEW
>
```

**Container**:
```tsx
<div className="flex gap-2 pb-2" data-tour="category-chips">
```

---

### 2. Onboarding Tour Targets

**New file**: `src/components/onboarding/steps.ts`
```ts
export const onboardingSteps = [
  { target: '[data-tour="discover-header"]', ... },
  { target: '[data-tour="category-chips"]', ... },
  { target: '[data-tour="nav-wallet"]', ... },
  { target: '[data-tour="nav-profile"]', ... },
];
```

**Data-tour attributes added to**:
- `DiscoverHeaderContent` → `data-tour="discover-header"`
- `CategoryFilter` container → `data-tour="category-chips"`
- BottomNavigation mybets → `data-tour="nav-wallet"`
- BottomNavigation profile → `data-tour="nav-profile"`

**Gating logic** (`OnboardingProvider.tsx`):
```ts
const canRunTour = 
  user && // Signed in
  !authLoading && // Auth loaded
  document.querySelector('[data-tour="discover-header"]'); // UI ready

// Don't render tour if gated
if (!canRunTour && state.isActive) {
  return <OnboardingContext.Provider value={contextValue}>{children}</OnboardingContext.Provider>;
}
```

---

### 3. Media Proxy (No More CORS/429)

**New serverless function**: `api/media-search.ts`
- 15-min in-memory cache
- CORS headers for allowed origins
- Tries Pexels → Unsplash
- Returns: `{ images: [{ url, width, height, credit }] }`

**Vercel rewrite** (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/media/search", "destination": "/api/media-search" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Client update** (`src/lib/media/resolveMedia.ts`):
```ts
const MEDIA_ENDPOINT = import.meta.env.VITE_MEDIA_ENDPOINT || '/media/search';
const USE_PROXY = true;

// In resolveMedia():
if (USE_PROXY) {
  const url = new URL(MEDIA_ENDPOINT, window.location.origin);
  url.searchParams.set('q', query);
  url.searchParams.set('per', '1');
  
  const res = await fetch(url.toString());
  const { images } = await res.json();
  // Use images[0].url
}
```

---

## Environment Variables

### Production (Vercel)
Set in Vercel Dashboard → Project Settings → Environment Variables:
- `PEXELS_API_KEY`
- `UNSPLASH_ACCESS_KEY`

### Development (.env)
```bash
VITE_MEDIA_ENDPOINT=/media/search  # Optional, defaults to this
```

---

## Local Development

```bash
# Terminal 1: Vercel Dev (for serverless functions)
cd client
vercel dev

# Terminal 2: Vite Dev
npm run dev
```

Or just use `npm run dev` if you don't need to test the media proxy locally.

---

## Testing

### Chips
1. Open Discover page
2. Verify chips are shorter and more fit per row
3. Check `data-tour` attributes in DevTools

### Onboarding
1. Sign in
2. Clear localStorage tour state if needed
3. Verify tour only runs when signed in
4. Check all 4 targets highlight correctly

### Media
1. Open Network tab in DevTools
2. Navigate to predictions
3. Verify calls go to `/media/search`
4. Verify no CORS errors
5. Repeat navigation - should see cached responses (no new network calls)

---

## Commit Message

```
feat(ui): smaller category chips; fix onboarding targets; proxy media via serverless to stop CORS/429

- Category chips now 28px tall for better density
- Onboarding tour gated properly (signed in + UI ready)
- Media images fetched via /media/search proxy to eliminate CORS/429
- Added data-tour attributes for stable tour targeting
- 15-min cache on media proxy reduces upstream API calls
```

---

## Rollback

Single command:
```bash
git revert <merge-sha>
```

All changes are isolated and easily reversible.
