# Migration Checklist

## Pre-Migration Setup

- [ ] **Database Migration**
  - [ ] Open Supabase SQL Editor
  - [ ] Execute `prediction_media.sql`
  - [ ] Verify table created: `SELECT * FROM prediction_media LIMIT 1;`
  - [ ] Confirm no errors in Supabase logs

- [ ] **Environment Variables**
  - [ ] Verify `VITE_MEDIA_ENDPOINT=/media/search` in `.env`
  - [ ] Confirm `VITE_SUPABASE_URL` is set
  - [ ] Confirm `VITE_SUPABASE_ANON_KEY` is set
  - [ ] Test Supabase connection

- [ ] **Backup Current System**
  - [ ] Document current media resolution logic
  - [ ] Take note of any custom implementations
  - [ ] Screenshot current image behavior

## Migration Steps

### Phase 1: Add New Code (No Breaking Changes)

- [ ] **Install New Files** ✅ (Already done!)
  - [x] `buildQuery.ts`
  - [x] `usePredictionMedia.ts`
  - [x] `index.ts` (exports)
  - [x] `examples.tsx` (reference)

- [ ] **Test Query Builder**
  ```bash
  npm test src/lib/media/buildQuery.test.ts
  ```
  - [ ] All tests passing
  - [ ] Review query outputs for your use cases

### Phase 2: Migrate Components (One at a Time)

- [ ] **Find Components Using Old Media Logic**
  ```bash
  # Search for old media resolution patterns
  grep -r "resolveMedia" src/
  grep -r "getImageUrl" src/
  grep -r "fetchPredictionImage" src/
  ```

- [ ] **Update PredictionCard Component**
  - [ ] Import `usePredictionMedia`
  - [ ] Replace old logic with hook
  - [ ] Add fallback UI for null images
  - [ ] Test in browser
  - [ ] Verify images load
  - [ ] Check browser console for errors

- [ ] **Update PredictionDetails Component**
  - [ ] Import `usePredictionMedia`
  - [ ] Replace old logic with hook
  - [ ] Add fallback UI for null images
  - [ ] Test in browser
  - [ ] **CRITICAL**: Verify same image as Card

- [ ] **Update Other Components**
  - [ ] PredictionList (if exists)
  - [ ] PredictionGrid (if exists)
  - [ ] PredictionPreview (if exists)
  - [ ] Any other components showing prediction images

### Phase 3: Testing

- [ ] **Manual Testing**
  - [ ] Create test prediction: "Will Apple announce iPhone 16?"
  - [ ] Verify query built correctly (check browser DevTools Network tab)
  - [ ] Confirm image loads in Card
  - [ ] Navigate to Details page
  - [ ] **VERIFY**: Same exact image shows in Details
  - [ ] Refresh page → image loads from cache (fast!)
  - [ ] Test in different browser → same image appears

- [ ] **Edge Cases**
  - [ ] Test with no category set
  - [ ] Test with very long title
  - [ ] Test with special characters in title
  - [ ] Test with API returning 0 results
  - [ ] Test with Supabase temporarily down

- [ ] **Performance Check**
  - [ ] First load: Image appears within 500ms
  - [ ] Cached load: Image appears within 50ms
  - [ ] No duplicate API calls visible in Network tab

### Phase 4: Production Readiness

- [ ] **Supabase RLS (Optional)**
  - [ ] Decide if RLS needed
  - [ ] Add policies if required (see SQL file)
  - [ ] Test with authenticated users
  - [ ] Test with anonymous users

- [ ] **Monitoring Setup**
  - [ ] Add error tracking for failed image loads
  - [ ] Monitor Supabase query performance
  - [ ] Track API call volume to media proxy

- [ ] **Documentation**
  - [ ] Update team wiki/docs
  - [ ] Share IMPLEMENTATION_GUIDE.md
  - [ ] Document any custom modifications

### Phase 5: Cleanup (After 1 Week Stable)

- [ ] **Remove Old Code**
  - [ ] Archive old media resolution functions
  - [ ] Remove unused imports
  - [ ] Clean up old test files
  - [ ] Remove old environment variables (if any)

- [ ] **Final Verification**
  - [ ] All prediction images loading correctly
  - [ ] No console errors
  - [ ] Supabase table growing appropriately
  - [ ] No performance regressions

## Rollback Plan (If Needed)

If something goes wrong:

1. **Revert Component Changes**
   ```bash
   git revert <commit-hash>
   ```

2. **Keep New Code for Future**
   - Don't delete new files
   - They don't interfere with old system
   - Can retry migration later

3. **Drop Supabase Table (Optional)**
   ```sql
   DROP TABLE IF EXISTS prediction_media;
   ```

## Success Criteria

✅ **Migration successful when:**
- Card and Details show identical images
- No CORS/429 errors in console
- Images load under 500ms (first time)
- Images load under 50ms (cached)
- "Apple iPhone" shows phone, not fruit
- All team members can see same images
- No Supabase errors in logs

## Questions/Issues?

- Review: `IMPLEMENTATION_GUIDE.md`
- Check: `examples.tsx` for usage patterns
- Test: `buildQuery.test.ts` for query examples
- Debug: Browser DevTools → Network tab

## Notes

- **No rush!** Migrate one component at a time
- **Test thoroughly** before moving to next component
- **Keep backups** of working code
- **Document** any custom changes you make
- **Ask for help** if stuck (leave comments in code)

---

**Last Updated:** [Add date when you start migration]  
**Migration Started By:** [Your name]  
**Status:** [ ] Not Started | [ ] In Progress | [ ] Complete
