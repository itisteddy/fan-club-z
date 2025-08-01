# Prediction Creation & Navigation Fix

## Issues Found

### 1. Database Schema Mismatch
- The `predictions` table has `participant_count` column but the creation code wasn't setting it
- API was expecting the field but not providing a default value

### 2. Scroll Position Issue  
- When navigating between screens, scroll position wasn't resetting to top
- This violates UI/UX best practices where new screens should start at the top

## Solutions Applied

### 1. Fixed Database Schema in Prediction Creation
- Updated prediction payload to include `participant_count: 0` as default
- Ensured all required fields are properly set with correct defaults

### 2. Added Scroll-to-Top Navigation Behavior
- Added useEffect in App.tsx to scroll to top on tab changes
- Implemented smooth scroll behavior with proper timing
- Added scroll-to-top for CreatePredictionPage specifically

## Files Modified
1. `/client/src/stores/predictionStore.ts` - Fixed prediction creation payload
2. `/client/src/App.tsx` - Added scroll-to-top behavior
3. `/client/src/pages/CreatePredictionPage.tsx` - Added scroll reset on mount
