# Staging Smoke Tests

## Automated smoke test (run before promotion)

Run the script that calls **GET /health** and **GET /health/deep** and fails fast if staging is miswired:

```bash
# From repo root (override URL if needed)
STAGING_API_URL=https://fanclubz-backend-staging.onrender.com pnpm run staging-smoke-test
# Or: pnpm run db:verify:staging
```

- **/health** must return HTTP 200 and `env: "staging"`.
- **/health/deep** checks DB connectivity and required tables (`users`, `wallets`, `predictions`, etc.). If any required table is missing or DB is unreachable, the script prints the failed checks and exits non-zero.
- Use the script output (and optional `requestId` from responses) to diagnose staging 500s.

See **`docs/promotion_checklist.md`** and **`docs/release_workflow.md`** for promotion steps.

---

## Manual smoke tests (before release to production)

Run these flows on staging to verify no regressions. Confirm **no production data** is modified.

---

## 1. Auth

- [ ] Sign up (new user)
- [ ] Sign in (existing user)
- [ ] Sign out
- [ ] OAuth (Google/Apple) if enabled
- [ ] Session persists across refresh

---

## 2. Predictions / Markets

- [ ] Discover page loads predictions
- [ ] Prediction details page loads
- [ ] Pagination works
- [ ] Filters/categories work
- [ ] Create prediction flow (if enabled)

---

## 3. Staking

- [ ] Select prediction and option
- [ ] Enter stake amount
- [ ] Place bet (demo/staging wallet)
- [ ] Bet appears in activity
- [ ] Balance updates

---

## 4. Settlement

- [ ] Settled predictions show correct outcome
- [ ] Payout/refund display
- [ ] Claim flow (if enabled)

---

## 5. Profile & Achievements

- [ ] Profile page loads
- [ ] Achievements/badges visible (if enabled)
- [ ] Edit profile (if enabled)

---

## 6. Leaderboard

- [ ] Leaderboard loads
- [ ] Pagination works
- [ ] Sorting/filters work

---

## 7. Wallet

- [ ] Wallet page loads
- [ ] Balance displays correctly
- [ ] Activity/history loads
- [ ] Daily claim (if enabled)

---

## 8. No Production Impact

- [ ] Staging backend **GET /health** returns HTTP 200 and `"env": "staging"`
- [ ] Staging backend **GET /health/deep** returns HTTP 200 and `ok: true` (all required tables present)
- [ ] Staging frontend uses staging Supabase (different project)
- [ ] No production DB writes during staging tests

---

## Production Release Checklist

1. [ ] All staging smoke tests pass
2. [ ] Backend health shows `env: staging` on staging
3. [ ] Frontend points to staging backend and Supabase on staging
4. [ ] Merge to production branch
5. [ ] Deploy production
6. [ ] Verify production health and auth
