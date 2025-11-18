# Fixes Summary - Image Stability & Onboarding Flow

## Date: 2025-11-17

## Overview
This document summarizes the fixes implemented for two critical issues:
1. Prediction card image flickering and lack of contextual images
2. Onboarding tour not flowing through app screens properly

---

## Issue 1: Prediction Card Images

### Problem
- Images were changing/flickering on every render
- Images were not contextual to prediction title and category
- No proper fallback mechanism from primary to backup provider
- Images could change after being displayed

### Solution Implemented

#### 1. Created `StableImageProvider.tsx`
A new hook `useStableImage` that ensures:
- **Image Stability**: Once an image is assigned to a prediction, it never changes
- **Contextual Images**: Images are fetched based on prediction title + category
- **Primary/Backup Strategy**: 
  - Primary provider: Pexels
  - Backup provider: Unsplash (auto-fallback if Pexels fails)
  - Final fallback: Category-based gradient
- **No Flickering**: Images are locked immediately after loading using `useRef` locks

#### 2. Enhanced `buildImageQuery()` in `queries.ts`
Improved query building strategy:
- Combines title keywords with category context for best matches
- Example: "Lakers Championship" + "Sports" → "lakers championship sports"
- Falls back gracefully through multiple strategies
- Ensures safe, appropriate image queries

#### 3. Updated `AutoImage.tsx`
- Now uses `useStableImage` instead of `useAutoImage`
- Removed `provider` prop (handled automatically internally)
- Maintains all existing UI/UX features (gradients, loading states, etc.)

#### 4. Updated `PredictionCardImage.tsx`
- Simplified to work with new stable image system
- No longer needs explicit provider selection

### Technical Details

**Image Locking Mechanism:**
```typescript
const imageLocked = useRef(false);
const fetchedRef = useRef(false);

// Once image is loaded, lock it permanently
imageLocked.current = true;
```

**Provider Fallback Chain:**
1. Check cache for Pexels image
2. Check cache for Unsplash image
3. Fetch from Pexels (primary)
4. Fetch from Unsplash (backup)
5. Use category gradient (final fallback)

**Contextual Query Building:**
- Extracts meaningful keywords from title (removes stopwords)
- Combines with category-specific terms
- Sanitizes to prevent inappropriate content

---

## Issue 2: Onboarding Tour Flow

### Problem
- Tour stayed on Discover page instead of navigating through screens
- Steps showed content not relevant to current screen
- Users couldn't see wallet, profile, or bets features during tour

### Solution Implemented

#### 1. Created `contextualOnboardingTours.tsx`
New tour configuration file with two tours:

**Full Contextual Tour** (`FULL_CONTEXTUAL_TOUR`):
- Starts on Discover page (search, filters, prediction feed)
- Navigates to Bets page (active/created/completed tabs)
- Navigates to Wallet page (balance, add funds, transactions)
- Navigates to Profile page (stats, history, settings)
- Returns to Discover to start using the app

**Quick Discover Tour** (`QUICK_DISCOVER_TOUR`):
- Shorter 5-step tour focused only on Discover page
- For users who want a quick intro

#### 2. Updated `OnboardingProvider.tsx`
- Imports new contextual tours
- Removed old static tour definitions
- Uses `onNext` callbacks to trigger navigation between screens
- Adds delays for page transitions to complete

### Tour Step Flow

**Screen-by-Screen:**

1. **Discover Page** (4 steps)
   - Welcome modal
   - Prediction feed highlight
   - Search bar spotlight
   - Category filters spotlight
   - Create FAB spotlight

2. **Navigate → Bets Page** (2 steps)
   - Overview modal
   - Tabs highlight (Active/Created/Completed)

3. **Navigate → Wallet Page** (3 steps)
   - Overview modal
   - Balance spotlight
   - Add funds button spotlight
   - Transaction history highlight

4. **Navigate → Profile Page** (3 steps)
   - Overview modal
   - Stats spotlight
   - Prediction history tabs highlight

5. **Navigate → Discover** (completion)
   - Success modal
   - Return to main page

### Technical Details

**Navigation Mechanism:**
```typescript
onNext: async () => {
  const navigate = (window as any).__router_navigate;
  if (navigate) {
    navigate('/bets');
    // Wait for page transition
    await new Promise(resolve => setTimeout(resolve, 400));
  }
}
```

**Context Awareness:**
- Each step is only shown when on the relevant screen
- Steps reference targets that exist on current page
- Modal steps don't require specific targets (work anywhere)

---

## Files Modified

### Image Stability
- ✅ `client/src/features/images/StableImageProvider.tsx` (NEW)
- ✅ `client/src/features/images/AutoImage.tsx` (UPDATED)
- ✅ `client/src/features/images/PredictionCardImage.tsx` (UPDATED)
- ✅ `client/src/features/images/queries.ts` (UPDATED)

### Onboarding Tour
- ✅ `client/src/config/contextualOnboardingTours.tsx` (NEW)
- ✅ `client/src/components/onboarding/OnboardingProvider.tsx` (UPDATED)

---

## Testing Recommendations

### Image Stability Testing
1. **Flickering Test**:
   - Navigate to Discover page
   - Scroll through predictions
   - Verify images don't flicker or change

2. **Contextual Relevance Test**:
   - Check predictions in different categories (Sports, Tech, Entertainment)
   - Verify images match the prediction topic
   - Example: Sports predictions should show sports imagery

3. **Provider Fallback Test**:
   - Monitor console logs (DEV mode with `VITE_DEBUG_LOGS=true`)
   - Check for `[stable-image]` logs showing primary/backup provider usage

4. **Persistence Test**:
   - View a prediction card
   - Navigate away and return
   - Verify same image is shown (should be cached)

### Onboarding Tour Testing
1. **Full Tour Test**:
   - Clear localStorage: `localStorage.removeItem('fcz_onboarding_state_v3')`
   - Refresh app
   - Accept full tour in welcome modal
   - Verify tour navigates through all 4 screens
   - Check each step shows relevant UI elements

2. **Quick Tour Test**:
   - Clear localStorage
   - Select "Quick Tour" option
   - Verify it stays on Discover page only

3. **Skip & Resume Test**:
   - Start tour
   - Skip halfway through
   - Verify user can navigate normally
   - Check tour doesn't restart unexpectedly

4. **Screen Context Test**:
   - For each tour step, verify:
     - Step title/description matches current screen
     - Target element exists and is highlighted
     - Navigation transitions smoothly

---

## UI/UX Improvements

### Image Experience
- ✨ **Zero flickering** - images load once and stay
- ✨ **Contextual** - images relate to prediction content
- ✨ **Reliable** - automatic fallback ensures images always show
- ✨ **Fast** - aggressive caching reduces network requests
- ✨ **Graceful degradation** - beautiful gradients when images unavailable

### Onboarding Experience
- ✨ **Guided journey** - natural flow through app features
- ✨ **Contextual learning** - see features on the screens they live on
- ✨ **Progressive disclosure** - start simple, build understanding
- ✨ **Flexible** - users can choose full or quick tour
- ✨ **Non-intrusive** - easy to skip, won't repeat unnecessarily

---

## Performance Considerations

### Image Loading
- Images are cached at multiple levels (memory + IndexedDB)
- Deterministic seeding ensures same image for same prediction
- Lazy loading for images below the fold
- LQIP (Low Quality Image Placeholder) support
- Timeout protection prevents hanging requests

### Tour Performance
- Minimal re-renders using React Context
- Lazy tour step rendering
- Navigation delays are minimal (200-400ms)
- Tour state persists in localStorage
- UI readiness checks prevent broken tours

---

## Known Limitations

### Images
- First load requires network request (expected)
- Images depend on external APIs (Pexels/Unsplash)
- Some niche topics may fall back to category gradients
- Image changes only persist per device (not synced across devices)

### Onboarding
- Requires specific `data-tour` attributes on UI elements
- Navigation relies on wouter router
- Tour state is local (doesn't sync across devices)
- Some animations may vary on slower devices

---

## Future Enhancements

### Image System
- [ ] Server-side image selection for consistency across all devices
- [ ] User preference for image vs gradient
- [ ] Image preloading for smoother experience
- [ ] CDN integration for faster loading
- [ ] Admin override for specific prediction images

### Onboarding
- [ ] Analytics tracking for tour completion rates
- [ ] A/B testing different tour flows
- [ ] Video walkthrough option
- [ ] Interactive challenges during tour
- [ ] Personalized tour based on user interests

---

## Build Status

✅ Build successful (2025-11-17)
✅ No linter errors
✅ All TypeScript types correct
✅ Bundle size: ~138KB CSS, main bundle ~71KB JS

---

## Rollback Instructions

If issues arise, revert these files:
```bash
git checkout HEAD~1 client/src/features/images/AutoImage.tsx
git checkout HEAD~1 client/src/features/images/PredictionCardImage.tsx
git checkout HEAD~1 client/src/features/images/queries.ts
git checkout HEAD~1 client/src/components/onboarding/OnboardingProvider.tsx
rm client/src/features/images/StableImageProvider.tsx
rm client/src/config/contextualOnboardingTours.tsx
```

Then rebuild:
```bash
cd client && npm run build
```

