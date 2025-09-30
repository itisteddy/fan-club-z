# Testing Checklist - UI Onboarding Media Fix

## Pre-Deployment Testing

### 1. Category Chips ✨

#### Visual Check
- [ ] Open the Discover page
- [ ] Verify chips are visibly shorter (~28px height)
- [ ] Count chips visible: Should see ~7-8 chips on mobile (vs 5-6 before)
- [ ] No text clipping or overflow
- [ ] Icons and labels properly aligned

#### Functional Check
- [ ] All chips are clickable/tappable
- [ ] Active state (dark background) displays correctly
- [ ] Hover state works on desktop
- [ ] Touch feedback works on mobile
- [ ] Filtering works when clicking chips

#### Technical Check
- [ ] Open DevTools → Elements
- [ ] Find category chips container
- [ ] Verify `data-tour="category-chips"` attribute exists
- [ ] Verify each chip has `data-tour="category-chips-item"`

---

### 2. Onboarding Tour 🎯

#### Setup
- [ ] Clear localStorage: `localStorage.clear()` in console
- [ ] Sign out if signed in
- [ ] Refresh the page

#### Test: Not Signed In (Should NOT show tour)
- [ ] Tour does NOT automatically start
- [ ] No onboarding modal appears
- [ ] No tour tooltips visible

#### Test: Sign In (Should show tour)
- [ ] Sign in with valid credentials
- [ ] Wait for auth to complete
- [ ] Tour welcome modal should appear
- [ ] Click "Start Tour" or "Quick Tour"

#### Test: Tour Progression
- [ ] **Step 1**: Discover header highlights
  - [ ] Tooltip appears above/below discover header
  - [ ] Content reads: "Browse trending markets..."
  - [ ] Next button works
  
- [ ] **Step 2**: Category chips highlight
  - [ ] Tooltip points to category chips
  - [ ] Content reads: "Tap a category to refine..."
  - [ ] Next button works
  
- [ ] **Step 3**: Wallet button highlights
  - [ ] Bottom nav "My Bets" button highlights
  - [ ] Content reads: "Deposits, balance and history..."
  - [ ] Next button works
  
- [ ] **Step 4**: Profile button highlights
  - [ ] Bottom nav "Profile" button highlights
  - [ ] Content reads: "Manage your account..."
  - [ ] Finish button works

#### Test: Tour Gating
- [ ] Start tour
- [ ] Open a modal (e.g., Create Prediction)
- [ ] Tour should pause/hide
- [ ] Close modal
- [ ] Tour should resume (or stay hidden if properly gated)

#### Technical Check
- [ ] Open DevTools → Elements
- [ ] Verify attributes exist:
  - [ ] `data-tour="discover-header"` on discover header
  - [ ] `data-tour="category-chips"` on chips container
  - [ ] `data-tour="nav-wallet"` on My Bets button
  - [ ] `data-tour="nav-profile"` on Profile button

---

### 3. Media Proxy 🖼️

#### Setup
- [ ] Open DevTools → Network tab
- [ ] Filter: XHR/Fetch
- [ ] Clear existing requests

#### Test: First Image Load (Cold)
- [ ] Navigate to Discover page
- [ ] Watch for network requests
- [ ] Look for requests to `/media/search?q=...`
- [ ] Verify response status: 200 OK
- [ ] Check response body: `{ images: [{ url, width, height, credit }] }`
- [ ] Images should load in prediction cards

#### Test: Cached Image Load (Warm)
- [ ] Navigate away from Discover
- [ ] Return to Discover page
- [ ] Watch Network tab
- [ ] Same images should load faster (from cache)
- [ ] No new upstream API calls (unless >15min passed)

#### Test: No CORS Errors
- [ ] Open DevTools → Console
- [ ] Navigate entire app
- [ ] **Should NOT see**:
  - [ ] "Access-Control-Allow-Origin" errors
  - [ ] "CORS policy" errors
  - [ ] "blocked by CORS" errors
- [ ] **Should NOT see**:
  - [ ] 429 Too Many Requests errors
  - [ ] Rate limit warnings

#### Test: Fallback Behavior
- [ ] If proxy fails, should fall back to curated images
- [ ] Images should still display (generic but relevant)
- [ ] No broken image icons

#### Technical Check
- [ ] Verify `vercel.json` has rewrite:
  ```json
  { "source": "/media/search", "destination": "/api/media-search" }
  ```
- [ ] Verify `api/media-search.ts` exists
- [ ] Verify environment variables set in Vercel (if deployed):
  - [ ] PEXELS_API_KEY
  - [ ] UNSPLASH_ACCESS_KEY

---

## Performance Testing

### Page Load
- [ ] Discover page loads in <2 seconds
- [ ] No layout shifts from image loading
- [ ] Smooth scrolling

### Image Loading
- [ ] First load: Acceptable delay (~300-500ms)
- [ ] Cached load: Very fast (<50ms)
- [ ] Loading states display properly

### Tour Performance
- [ ] Tour doesn't block page interaction
- [ ] Smooth transitions between steps
- [ ] No lag or jank

---

## Browser Compatibility

Test on:
- [ ] Chrome (desktop)
- [ ] Safari (desktop)
- [ ] Firefox (desktop)
- [ ] Chrome (Android)
- [ ] Safari (iOS)

---

## Edge Cases

### Category Chips
- [ ] Very long category names (should truncate or wrap gracefully)
- [ ] Many categories (should scroll horizontally)
- [ ] Touch on small screens (44x44px minimum tap target maintained)

### Onboarding
- [ ] Rapid navigation during tour (should handle gracefully)
- [ ] Browser back/forward during tour
- [ ] Multiple browser tabs (tour state consistent)
- [ ] Sign out during tour (should stop)

### Media
- [ ] Offline mode (should show fallback images)
- [ ] Slow connection (should timeout gracefully)
- [ ] Invalid query strings (should handle errors)
- [ ] Missing API keys (should fall back to curated images)

---

## Regression Testing

Verify existing features still work:
- [ ] Search predictions
- [ ] Place a bet
- [ ] Create a prediction
- [ ] View wallet
- [ ] Navigate between pages
- [ ] Sign in/out
- [ ] Notifications

---

## Production Deployment Checks

### Before Deploy
- [ ] All tests passing locally
- [ ] No console errors
- [ ] No broken images
- [ ] Tour works correctly
- [ ] Environment variables documented

### After Deploy
- [ ] Production URL loads correctly
- [ ] Run through all tests again on production
- [ ] Check Vercel function logs for errors
- [ ] Monitor for CORS errors in real user sessions
- [ ] Check analytics for tour completion rates

### Environment Variables (Vercel)
- [ ] PEXELS_API_KEY set for all environments
- [ ] UNSPLASH_ACCESS_KEY set for all environments
- [ ] Values are correct (test a request)

---

## Rollback Procedure

If critical issues found:

1. **Immediate**:
   ```bash
   git revert <merge-commit-sha>
   git push origin fix/ui-onboarding-media
   ```

2. **Verify**:
   - [ ] App loads without errors
   - [ ] Critical features work
   - [ ] No data loss

3. **Investigate**:
   - [ ] Review logs
   - [ ] Identify root cause
   - [ ] Fix and re-test
   - [ ] Re-deploy when ready

---

## Sign-Off

### Developer
- [ ] All code changes reviewed
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Ready for staging

**Signed**: _______________ **Date**: ___________

### QA
- [ ] All test cases executed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Ready for production

**Signed**: _______________ **Date**: ___________

### Product
- [ ] Feature meets requirements
- [ ] UX improvements verified
- [ ] Ready for release

**Signed**: _______________ **Date**: ___________

---

## Notes

Use this space for any issues found or observations:

```
[Add notes here]
```
