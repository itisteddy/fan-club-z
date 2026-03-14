# Bundled Staging Release — Scope Note

**Branch:** `claude/analytics-foundation-bQlCE`  
**Type:** Bundled staging regression + analytics validation release (not analytics-only)

---

## A. Analytics-specific changes

| Area | Change |
|------|--------|
| **Migrations 344–347** | New tables: `analytics_daily_snapshots`, `product_events`, `user_activation_status`, `referral_daily_snapshots`. Views: `v_referral_performance`, `v_team_referral_scorecard`. Functions: `upsert_analytics_snapshot`, `compute_user_activation`, `compute_qualified_referrals`, `upsert_referral_snapshot`, `backfill_*`. |
| **346** | `referral_attributions` + columns: `is_activated`, `activated_at`, `is_qualified`, `qualified_at`, `is_retained`, `retained_at` (defaults; cron-updated). |
| **Server** | `analyticsEventService.ts`, `POST /api/v2/events`, admin analytics routes, `cron/analyticsSnapshot.ts`, `cron/retentionCompute.ts`, `referralScoring.ts`. |
| **Instrumentation** | Fire-and-forget `logProductEvent` in referrals (attribute, log-login) and `atomicBetPlacement` (stake_placed). |
| **Client** | Admin analytics dashboard, 5 tabs, report presets, team/referral scorecards, CSV export. |
| **Hardening** | Snapshot/retention crons fail-open; overlap guards; migration 347 RLS policy idempotent. |

---

## B. Non-analytics bundled changes

| Area | Change |
|------|--------|
| **Stake / wallet** | Zaurum bucket debit, `placeBet` option sync, `zaurumBuckets.ts`, `walletBalanceAccounts.ts`. |
| **Settlement** | Settlement/merkle path changes, `addToBucket`, `normalizeBucketBalances`, column fallbacks. |
| **Index / infra** | CORS via `getCorsOrigins()`, health/debug routers, `requestIdMiddleware`. |
| **Client** | Zaurum/wallet/prediction UI, activity feed, profile, modals. |

---

## C. Critical core flows requiring regression coverage

1. **Signup** — OAuth + session creation  
2. **Login** — Session hydration, referral log-login  
3. **Referral attribution** — New user with `?ref=`  
4. **Prediction creation** — Crypto + fiat paths  
5. **Stake placement** — Amount, odds, wallet/zaurum debit  
6. **Settlement** — Creator settle, merkle/manual  
7. **Claim** — User claim winnings  
8. **Wallet / Zaurum** — Balance, buckets, transfers  
9. **Admin access** — Auth, routes  
10. **Analytics** — Dashboard tabs, backfill, CSV, team scorecards, cron health  
