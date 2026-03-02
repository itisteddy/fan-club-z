# UI Consistency Update for Auth-Guarded Pages

## Summary
Updated the UI to be consistent across all pages that are blocked by the auth guard. When users are not logged in and try to access protected features, they now see a unified, friendly prompt to sign in.

## Changes Made

### 1. Created Reusable AuthRequiredState Component
**File:** `/client/src/components/ui/empty/AuthRequiredState.tsx`
- New component that provides consistent UI/UX when users need to sign in
- Accepts customizable icon, title, description, and auth intent
- Automatically handles opening the auth gate with appropriate context
- Matches the design patterns used across the app

### 2. Updated UnifiedMyBetsPage
**File:** `/client/src/pages/UnifiedMyBetsPage.tsx`
- Replaced custom auth-required logic with `AuthRequiredState` component
- Maintains same functionality but with consistent UI

### 3. Updated UnifiedWalletPage
**File:** `/client/src/pages/UnifiedWalletPage.tsx`
- Replaced custom auth-required logic with `AuthRequiredState` component
- Maintains same functionality but with consistent UI

### 4. Updated UnifiedProfilePage
**File:** `/client/src/pages/UnifiedProfilePage.tsx`
- Replaced custom auth-required logic with `AuthRequiredState` component
- Maintains same functionality but with consistent UI

### 5. Enhanced PredictionDetailsContent Component
**File:** `/client/src/components/prediction/PredictionDetailsContent.tsx`
- Added `AuthRequiredState` import
- Updated betting options section to show auth prompt when user selects an option without being logged in
- Users can view prediction details and options, but see a friendly prompt when they try to place a bet

### 6. Enhanced PredictionActionPanel Component
**File:** `/client/src/components/prediction/PredictionActionPanel.tsx`
- Added `isAuthenticated` prop (optional, defaults to `true` for backward compatibility)
- Shows `AuthRequiredState` instead of stake input when user selects an option but isn't authenticated
- Wrapped in an emerald-themed container for visual consistency

### 7. Updated PredictionDetailsPageV2
**File:** `/client/src/pages/PredictionDetailsPageV2.tsx`
- Passes `isAuthenticated` prop to `PredictionActionPanel`
- Ensures the auth-required prompt appears correctly when users try to place bets

### 8. Created Index Export
**File:** `/client/src/components/ui/empty/index.ts`
- Exports both `EmptyState` and `AuthRequiredState` for easier imports

## User Experience Improvements

### Before
- **My Bets, Wallet, Profile pages:** Showed custom sign-in prompts with slightly different styling
- **Prediction Details page:** Either showed an error or allowed users to proceed without clear feedback about needing to sign in

### After
- **All protected pages:** Now show a consistent, friendly prompt with the same styling
- **Prediction Details page:** 
  - Users can browse prediction details and see all options
  - When they select an option to bet, a clear prompt appears asking them to sign in
  - The prompt includes context about why they need to sign in ("Sign in to place your bet")
  - Maintains the same interaction pattern as other protected features

## Design Consistency
All auth-required states now feature:
- Consistent icon sizing and positioning
- Same button styling (emerald-600 background)
- Unified text hierarchy (title and description)
- Appropriate spacing and padding
- Proper accessibility attributes

## Technical Notes
- The `AuthRequiredState` component is fully reusable across the application
- All changes are backward compatible
- No breaking changes to existing functionality
- The component properly integrates with the existing auth gate system
