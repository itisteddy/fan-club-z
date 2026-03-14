# Analytics branch — regression-safety audit

**Branch reviewed:** `origin/claude/analytics-foundation-bQlCE` vs `main`  
**Date:** 2025-03-14  
**Migrations on disk:** `server/migrations/344_*` … `347_*` (checked out + 347 RLS policy hardened)

---

## 1. Files / routes / flows touched

### Purely additive (analytics)

| Area | What |
|------|------|
| **Migrations 344–347** | New tables: `analytics_daily_snapshots`, `product_events`, `user_activation_status`, `referral_daily_snapshots`. New views: `v_referral_performance`, `v_team_referral_scorecard`. New functions: `upsert_analytics_snapshot`, `compute_user_activation`, `compute_qualified_referrals`, `upsert_referral_snapshot`, `backfill_*`. |
| **346** | **ALTER** `referral_attributions`: adds `is_activated`, `activated_at`, `is_qualified`, `qualified_at`, `is_retained`, `retained_at` (defaults). Does not change signup/attribute **writes** in app code beyond what cron updates. |
| **Server** | `analyticsEventService.ts`, `routes/events.ts` (`POST /api/v2/events`), `routes/admin/analytics.ts`, `routes/admin/teamAnalytics.ts`, `cron/analyticsSnapshot.ts`, `cron/retentionCompute.ts`, `constants/referralScoring.ts`. |
| **Instrumentation** | `logProductEvent()` (no `await` on hot paths): `referrals.ts` (attribute + log-login), `atomicBetPlacement.ts` (after successful stake insert). |
| **Client** | Admin analytics pages, `App.tsx` routing, docs under `docs/analytics/`. |

### Same branch, **not** analytics-only (behavior / risk)

| Area | Risk |
|------|------|
| **`server/src/index.ts`** | CORS via `getCorsOrigins()`, health/debug routers, `requestIdMiddleware`, **two `setInterval` crons** (snapshot + retention). |
| **`placeBet.ts` + `atomicBetPlacement.ts` + `zaurumBuckets.ts`** | Staking path changes (bucket debit, option sync). **Core stake behavior — not only analytics.** |
| **`settlement.ts` + wallet services** | Settlement / merkle / bucket logic. **Core settlement — not only analytics.** |
| **Client** | Large Zaurum/wallet/prediction UI deltas merged on same branch. |

---

## 2. Additive vs behavior-changing

| Change | Additive | Behavior-changing |
|--------|----------|-------------------|
| `product_events` insert from server | Yes | No (fail-open service). |
| `POST /api/v2/events` | Yes | New endpoint; 202 before DB write. |
| `logProductEvent` in referrals | Yes | No (fire-and-forget). |
| `logProductEvent` in `atomicBetPlacement` | Yes | No — inserted **after** successful DB work, not awaited. |
| Migrations 344–345 | Yes | No app logic. |
| 346 `referral_attributions` columns | Yes | Cron **updates** rows over time — **reporting only**, not signup gate. |
| 347 `referral_daily_snapshots` | Yes | Reporting. |
| Cron RPCs | Yes | Extra DB load daily; failures logged. |
| Zaurum bucket / settlement / placeBet edits on branch | — | **Yes** — must be regression-tested separately. |

---

## 3. Can analytics block the core action?

| Path | Blocks? | Notes |
|------|---------|------|
| `logProductEvent` | **No** | Swallows errors; `42P01`/missing table → warn once, then skip. |
| `POST /api/v2/events` | **No** | Returns 202 immediately; insert is async without `await` in handler. |
| Referrals attribute / log-login | **No** | `logProductEvent` not awaited. |
| Stake (`atomicBetPlacement`) | **No** | Event logged after successful insert; not awaited. **Stake failure unchanged by analytics.** |
| Cron | **No** | Runs on timer; failures do not return 5xx to users. **Hardened:** snapshot RPC no longer throws; overlap guards added. |

---

## 4. Migrations — tables / constraints / RLS

| Migration | Risk |
|-----------|------|
| **344** | New table + view + function. RLS SELECT open on snapshot table (admin gate = API). **No change to existing tables** except view reads `referral_clicks`, `referral_attributions`, etc. |
| **345** | New `product_events` + CHECK on `event_name`. **No ALTER on core tables.** |
| **346** | **ALTER referral_attributions** — additive columns. **RLS unchanged** on that table. Heavy PL/pgSQL batch jobs — run in cron, not user requests. |
| **347** | New `referral_daily_snapshots`, views, functions. **Policy `rds_select_all`** — now **idempotent** (DO block) for re-run safety. |

** Preconditions:** `user_stats_daily`, `wallet_transactions.direction`, `predictions.creator_id` vs `created_by` — migration SQL uses exception handlers where needed.

---

## 5. Cron / bootstrap

| Job | Stability |
|-----|-----------|
| `runAnalyticsSnapshot` | **Hardened:** RPC errors logged, not thrown; single-flight guard so overlapping ticks don’t pile up. |
| `runRetentionCompute` | **Hardened:** try/finally + overlap guard; activation vs qualified vs referral snapshot RPCs use **separate** “migration missing” flags so one missing RPC doesn’t permanently disable the others. |
| Startup | Same process as API — long RPCs can add CPU/DB load during deploy window; does **not** block HTTP server listen. |

---

## 6. Referral / login / prediction / stake beyond analytics

- **Referrals:** Extra `logProductEvent` calls — additive.
- **Login:** `log-login` + event — additive.
- **Prediction create:** If instrumented server-side on branch — same fail-open pattern.
- **Stake:** Branch also changes **zaurum bucket / placeBet** — **that is real product behavior**, not analytics-only.
- **Settlement:** Branch touches settlement — **regression scope beyond analytics.**

---

## Mitigations applied (this workspace)

1. **`analyticsSnapshot.ts`:** `upsertDailySnapshot` never throws; all RPC failures logged. Overlap guard for cron.
2. **`retentionCompute.ts`:** Separate `_activationRpcOk` / `_qualifiedRpcOk`; `runRetentionCompute` wrapped; overlap guard.
3. **`347_team_referral_analytics.sql`:** `CREATE POLICY` wrapped in `DO $$ … IF NOT EXISTS (pg_policies) … $$`.

---

## A. Touched files (analytics-specific — server + migrations)

```
server/migrations/344_analytics_daily_snapshots.sql
server/migrations/345_product_events.sql
server/migrations/346_retention_qualified_referrals.sql
server/migrations/347_team_referral_analytics.sql
server/src/services/analyticsEventService.ts
server/src/routes/events.ts
server/src/cron/analyticsSnapshot.ts
server/src/cron/retentionCompute.ts
server/src/routes/referrals.ts (instrumentation)
server/src/services/atomicBetPlacement.ts (instrumentation)
server/src/routes/admin/analytics.ts
server/src/routes/admin/teamAnalytics.ts
server/src/constants/referralScoring.ts
docs/analytics/*
```

*(Full branch also touches 100+ other files — see `git diff main...origin/claude/analytics-foundation-bQlCE --name-only`.)*

---

## B. Regression risks (explicit)

1. **Mixed branch:** Stake/settlement/wallet changes **coexist** with analytics — staging must validate **both**.
2. **346 cron** updates `referral_attributions` — wrong SQL could corrupt flags (mitigation: staging + idempotent definitions).
3. **345 CHECK** on `event_name` — server must only insert allowed names (service + events router enforce).
4. **CORS / health refactor** on `index.ts` — could break clients if misconfigured.
5. **DB load:** Daily crons + `backfill_referral_snapshots(90)` — monitor staging DB during first deploy.

---

## C. Mitigations applied

See “Mitigations applied” above + existing `logProductEvent` swallow-all behavior.

---

## D. Staging smoke — unrelated core flows

- [ ] **Signup / login** (OAuth + session)
- [ ] **Referral attribute** (new user with `?ref=`)
- [ ] **Referral log-login** (optional analytics event)
- [ ] **Prediction create** (crypto + fiat if applicable)
- [ ] **Stake placement** (amount, odds update, wallet/zaurum)
- [ ] **Claim / settlement** (creator settle + user claim if available)
- [ ] **Admin** (admin routes + analytics dashboards read-only)
- [ ] **Health** (`/health` or new health router — confirm contract)

---

## E. Recommendation

**Safe with caveats**

- Analytics instrumentation is **fail-open** and non-blocking.
- **Caveat:** The branch is **not** analytics-only. Before production: staging deploy, `pnpm parity:check`, `pnpm smoke:staging`, and **explicit** stake/settlement/wallet passes — treat as a **combined** release unless you split the merge.

---

## Open in Cursor

- `server/migrations/344_analytics_daily_snapshots.sql`
- `server/migrations/345_product_events.sql`
- `server/migrations/346_retention_qualified_referrals.sql`
- `server/migrations/347_team_referral_analytics.sql`
