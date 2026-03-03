# Staging Smoke Tests

## Before Release to Production

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

- [ ] Staging backend `/health` returns `"env": "staging"`
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
