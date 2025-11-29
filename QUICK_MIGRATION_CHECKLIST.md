# ⚡ Quick Migration Checklist

**Use this checklist during migration - check off each step as you complete it.**

---

## 🔴 Pre-Migration (CRITICAL - Do First!)

- [ ] **Create recovery point:**
  ```bash
  git checkout main && git pull
  git checkout -b recovery/pre-badges-$(date +%Y%m%d-%H%M%S)
  git tag -a fcz-pre-badges-$(date +%Y%m%d-%H%M%S) -m "Pre-badges recovery"
  git push origin recovery/pre-badges-* && git push origin fcz-pre-badges-*
  ```

- [ ] **Verify wallet/payment works in production** (test deposit, withdraw, balance)

---

## 📊 Phase 1: Database Migrations

- [ ] Run `201_users_referrals.sql` in Supabase SQL Editor
- [ ] Run `202_referral_clicks.sql` in Supabase SQL Editor
- [ ] Run `203_referral_attributions.sql` in Supabase SQL Editor
- [ ] Run `204_auth_logins.sql` in Supabase SQL Editor
- [ ] Run `205_referral_stats_mv.sql` in Supabase SQL Editor
- [ ] Run `206_referral_stats_mv_v2.sql` in Supabase SQL Editor
- [ ] Run `301_badges_og.sql` in Supabase SQL Editor
- [ ] Run `302_badges_admin_views.sql` in Supabase SQL Editor
- [ ] Run `303_badges_member_numbers.sql` in Supabase SQL Editor
- [ ] **Verify:** Run verification queries (see SAFE_PRODUCTION_MIGRATION_PLAN.md)

---

## 🔧 Phase 2: Backend Deployment

- [ ] Commit backend changes:
  ```bash
  git add server/src/routes/badges.ts server/src/routes/referrals.ts
  git add server/src/routes/users.ts server/src/index.ts
  git commit -m "feat(backend): badges and referrals routes"
  ```

- [ ] Push to main: `git push origin main`

- [ ] Wait for Render deployment (~3 min)

- [ ] **Verify:** Routes return 404 (feature flags OFF):
  ```bash
  curl https://api.fanclubz.app/api/badges/og/summary
  # Should return 404
  ```

---

## 🎨 Phase 3: Frontend Deployment

- [ ] Commit frontend changes:
  ```bash
  git add client/src/components/badges/ client/src/components/referral/
  git add client/src/components/profile/ client/src/components/comments/CommentAuthorChip.tsx
  git add client/src/pages/ProfilePageV2.tsx client/src/pages/UnifiedLeaderboardPage.tsx
  git add client/src/hooks/useReferral.ts client/src/lib/referral.ts
  git add client/public/badges/
  git commit -m "feat(frontend): badges and referrals UI"
  ```

- [ ] Push to main: `git push origin main`

- [ ] Wait for Vercel deployment (~3 min)

- [ ] **Verify:** Features are hidden (feature flags OFF in Vercel)

---

## 🚀 Phase 4: Enable Features (Gradual)

### Backend First:
- [ ] In Render: Set `BADGES_OG_ENABLE=1` and `REFERRAL_ENABLE=1`
- [ ] Redeploy backend
- [ ] **Test:** API endpoints return data (not 404)

### Frontend Second:
- [ ] In Vercel: Set `VITE_BADGES_OG_ENABLE=1` and `VITE_REFERRALS_ENABLE=1`
- [ ] Redeploy frontend
- [ ] **Test:** Badges/referrals appear on profile page

---

## ✅ Post-Migration Verification

### Wallet (CRITICAL):
- [ ] Wallet page loads
- [ ] Balance displays correctly
- [ ] Deposit works
- [ ] Withdraw works
- [ ] Transaction history works
- [ ] Staking works

### Payment (CRITICAL):
- [ ] USDC deposit flow works
- [ ] USDC withdraw flow works
- [ ] WalletConnect works
- [ ] On-chain transactions work

### Badges & Referrals (New):
- [ ] Badges show on profile
- [ ] Referral section shows on profile
- [ ] Badges show in leaderboard
- [ ] Badges show in comments

---

## 🚨 If Something Breaks:

1. **IMMEDIATELY disable feature flags:**
   - Render: `BADGES_OG_ENABLE=0`, `REFERRAL_ENABLE=0`
   - Vercel: `VITE_BADGES_OG_ENABLE=0`, `VITE_REFERRALS_ENABLE=0`

2. **If needed, full rollback:**
   ```bash
   git checkout recovery/pre-badges-*
   # Redeploy both backend and frontend
   ```

---

**Time Estimate:** 30-45 minutes total  
**Risk Level:** LOW (features are isolated and feature-flagged)

