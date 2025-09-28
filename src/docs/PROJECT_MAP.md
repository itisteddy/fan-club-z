# FCZ Project Map - Canonical Sources

This document defines the single canonical source for each page and component family.

## Routes → Canonical Pages

| Route | Canonical File | Description |
|-------|---------------|-------------|
| `/` | `src/pages/DiscoverPage.tsx` | Main discovery page |
| `/prediction/:id` | `src/pages/PredictionDetailsPageV2.tsx` | Individual prediction details |
| `/predictions` | `src/pages/PredictionsPage.tsx` | My Bets - 3 tabs: Active/Created/Completed |
| `/wallet` | `src/pages/WalletPageV2.tsx` | User wallet and transactions |
| `/profile` | `src/pages/ProfilePageV2.tsx` | User profile |
| `/leaderboard` | `src/pages/UnifiedLeaderboardPage.tsx` | Rankings and leaderboards |

## Shared UI Components

| Component Family | Canonical File | Description |
|-----------------|---------------|-------------|
| Header | `src/components/layout/AppHeader.tsx` | Single header for all pages |
| Tabs | `src/components/nav/SegmentedTabs.tsx` | Shared segmented tabs |
| Icons | `src/icons/index.ts` | Single icon registry |
| Auth Gate | `src/auth/useAuthGate.ts` + `src/auth/AuthGateModal.tsx` | Single auth gate system |
| Cards | `src/components/ui/card/Card.tsx` | Unified card components |
| Comments | `src/store/unifiedCommentStore.ts` | Single comment system |

## Stores

| Store | Canonical File | Description |
|-------|---------------|-------------|
| Predictions | `src/stores/predictionStore.ts` | Main prediction state |
| Comments | `src/store/unifiedCommentStore.ts` | Comment state |
| Wallet | `src/stores/walletStore.ts` | Wallet state |
| Auth | `src/store/authStore.ts` | Authentication state |

## Rules

1. **No duplicates allowed** - Each concern has exactly one canonical file
2. **Import via aliases** - Use `@pages/*`, `@components/*` etc.
3. **Legacy files must be removed** - Not renamed or kept alongside
4. **Functionality must be merged** - Don't lose features when consolidating
