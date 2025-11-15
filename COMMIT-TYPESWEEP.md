# TypeScript Remediation - Commit Message

## Summary

Phase 1 of typecheck remediation: removed club references, added type shims, verified component props and path aliases. Cannot complete full remediation without bash access to run typecheck.

## Changes

### Model Alignment
- Removed Club, CreateClub, ClubMember from shared/src/types/social.ts
- Removed club_id field from Comment interface  
- Added UnifiedComment to client/src/types/domain.ts with required author

### Type Shims
- Added client/src/types/shims/wagmi.d.ts for wagmi connector types
- Added client/src/types/shims/gtag.d.ts for Google Analytics

### Verification (No Changes)
- Component props already normalized (DepositUSDCModal, StatCard, AppHeader)
- Path aliases correctly configured in tsconfig.json
- API helpers have proper generic defaults
- Error monitoring has proper type guards

### Documentation
- Created docs/typesweep.md tracking progress
- Created analyze-types.sh for user to run typecheck
- Created README-TYPESWEEP.md with next steps

## Impact

Estimated ~15-30 errors eliminated from ~390 baseline:
- Club type references: ~10-20 errors
- Import type errors: ~5-10 errors

Remaining ~360-375 errors require typecheck output to target.

## Testing

⚠️ Cannot test without bash access to OneDrive directory
User must run: `npm run typecheck` and report results

## Breaking Changes

None - only removed unused club types and added missing type definitions

## Next Steps

1. User runs `./analyze-types.sh`
2. User shares error count + samples
3. Iterate on remaining errors with @ts-nocheck for legacy files
4. Target component/store/utility type fixes based on actual errors

---

## Commit Command (When Ready)

```bash
git add -A
git commit -m "chore(types): remove club refs, add type shims, verify props

- Remove Club/ClubMember/CreateClub from shared types
- Remove club_id from Comment interface  
- Add UnifiedComment with required author field
- Add wagmi connector type shims
- Add gtag type shims
- Verify component props (DepositUSDCModal, StatCard, AppHeader)
- Verify tsconfig path aliases
- Create analysis tools for next iteration

Estimated impact: ~15-30 errors eliminated
Remaining: ~360-375 (need typecheck output)

Tracking: docs/typesweep.md
Tools: analyze-types.sh, README-TYPESWEEP.md"
```
