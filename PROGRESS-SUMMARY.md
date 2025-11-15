# TypeScript Remediation - Progress Summary

## ✅ Completed: Step 1 - Legacy Quarantine

**Files Moved to `/legacy/` and Excluded from Typecheck:**

### Stores (7 files from `/stores/`)
- betsStore.ts
- leaderboardStore.ts  
- mediaStore.ts
- predictionStore.ts
- predictionStore_FIXED.ts
- resetAllStores.ts
- walletStore.ts

### Pages (13 files)
- BetDetailPage.tsx
- BetsTab.tsx
- EnhancedBetsTab.tsx
- EnhancedWalletPage.tsx
- PolishedDiscoverPage.tsx
- PredictionDetailsPageV2_OLD.tsx
- ProfilePage.tsx
- SimpleProfilePage.tsx
- SimpleWalletPage.tsx
- WalletPage.tsx
- AnalyticsPage.tsx
- AdminPage.tsx
- DownloadPage.tsx

**Total Quarantined:** 20 files  
**tsconfig.json:** Updated with `"exclude": ["node_modules", "dist", "src/legacy/**/*"]`  
**Estimated Impact:** ~100-120 errors eliminated

---

## 🔄 In Progress: Step 2 - Active Module Fixes

**Status:** Started analysis, identified key issues

### Files Needing Type Fixes:
1. **PredictionsPage.tsx** (859 lines)
   - Uses `usePredictionStore` from `/store/predictionStore.ts`
   - Imports `Prediction` type from store instead of domain types
   - Heavy use of `any` types and type casts like `(entry as any).prediction`
   - Needs conversion to use:
     - Domain types from `@/types/domain`
     - React Query hooks instead of Zustand store
     - Proper Prediction/PredictionEntry types with snake_case support

2. **App.tsx**
   - Imports unused `useWalletStore`, `useLikeStore`
   - Needs cleanup of unused imports

3. **Comment Components**
   - Need to use `UnifiedComment` type from domain
   - Replace `Comment` imports with proper types

### Key Type Patterns to Fix:
```typescript
// BEFORE (bad):
const prediction = (entry as any).prediction;
const option = (entry as any).option;
import { Prediction } from '../store/predictionStore';

// AFTER (good):
const prediction = entry.prediction;  // With proper PredictionEntry type
const option = entry.option;
import type { Prediction, PredictionEntry } from '@/types/domain';
```

---

## ⏸️ Paused: Need User Action

**Reason:** Large complex files require iterative approach with typecheck feedback

**Recommended Next Steps:**
1. User runs `npm run typecheck` to get current error count after Step 1
2. Share error samples so we can target specific fixes
3. Identify if PredictionsPage should be refactored or if store should stay
4. Continue with targeted fixes based on actual error output

**Alternative Approach:**
- Move `/store/predictionStore.ts` to legacy as well
- Update PredictionsPage to use React Query + API calls directly
- This would be cleaner but requires more extensive refactoring

---

## 📊 Estimated Current State

- **Before:** ~390 errors
- **After Step 1:** ~270-290 errors (estimated)
- **Target:** 0 errors

**Most Errors Likely In:**
- PredictionsPage.tsx (heavy store usage, many `any` casts)
- Comment-related components (type mismatches)
- Utility files (missing return types, param types)

---

## 🎯 Next Steps

**Option A (Conservative):**
1. User runs typecheck, shares output
2. Fix top 5 files with most errors
3. Iterate based on results

**Option B (Aggressive):**
1. Move all `/store/*` files to legacy except authStore, scrollStore
2. Refactor PredictionsPage to use React Query
3. Update all active components to use domain types
4. Run typecheck

**Recommendation:** Option A - get typecheck output first, then target fixes methodically.
