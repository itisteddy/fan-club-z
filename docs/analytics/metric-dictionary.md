# Fan Club Z – Analytics Metric Dictionary

This document defines every metric exposed in the admin analytics dashboard and associated APIs.

---

## 1. Platform Overview Metrics

Source table: `analytics_daily_snapshots` (one row per calendar day).

| Metric | Column | Definition |
|--------|--------|------------|
| **New Users** | `new_users_count` | Users whose `created_at` falls on that day. |
| **Active Users** | `active_users_count` | Distinct users with `user_stats_daily.stakes_count > 0 OR comments_count > 0` on that day. |
| **Cumulative Users** | `cumulative_users_count` | Total users created up to end of that day. |
| **New Predictions** | `new_predictions_count` | Predictions with `created_at` on that day. |
| **Settled Predictions** | `settled_predictions_count` | Predictions with `settled_at` on that day. |
| **Stakes Count** | `total_stakes_count` | Sum of `user_stats_daily.stakes_count` for that day. |
| **Stake Volume** | `total_stake_amount` | Sum of `user_stats_daily.stake_amount` (USD) for that day. |
| **Payout Amount** | `total_payout_amount` | Sum of `user_stats_daily.payouts_amount` (USD) for that day. |
| **Creator Earnings** | `total_creator_earnings_amount` | Sum of `user_stats_daily.creator_earnings_amount` (USD) for that day. |
| **Comments** | `total_comments_count` | Sum of `user_stats_daily.comments_count` for that day. |
| **Deposits** | `total_deposits_amount` | Sum of completed `wallet_transactions` with `direction='credit'` on that day. |
| **Withdrawals** | `total_withdrawals_amount` | Sum of completed `wallet_transactions` with `direction='debit'` on that day. |
| **Net Flow** | `total_net_flow` | `deposits - withdrawals`. Positive = net inflow. |
| **New Referral Clicks** | `new_referral_clicks` | Rows inserted into `referral_clicks` on that day. |
| **New Referral Signups** | `new_referral_signups` | Rows inserted into `referral_attributions` on that day. |
| **Unique Stakers** | `unique_stakers_count` | Distinct users who placed at least one stake on that day. |
| **New Activated Users** | `new_activated_users_count` | Users whose activation milestone was first reached on that day (see §8). |
| **Weekly Active Economic Users** | `weekly_active_economic_users` | Distinct users with ≥1 stake in the 7-day window ending on that day (see §8). |
| **New Activated Referrals** | `new_activated_referrals_count` | Referred users whose `is_activated` flag turned true on that day. |
| **New Qualified Referrals** | `new_qualified_referrals_count` | Referred users whose `is_qualified` flag turned true on that day (see §9). |
| **New Retained Referrals** | `new_retained_referrals_count` | Referred users whose `is_retained` flag turned true on that day (see §9). |
| **Claims Completed** | `claim_completed_count` | `product_events` rows with `event_name = 'claim_completed'` on that day. |
| **Claims Failed** | `claim_failed_count` | `product_events` rows with `event_name = 'claim_failed'` on that day. |
| **Likes** | `likes_count` | `product_events` rows with `event_name = 'like_added'` on that day. |
| **Product Events** | `product_events_count` | Total rows inserted into `product_events` on that day. |

### Derived/Summary Metrics (computed in API layer)

| Metric | Formula | Notes |
|--------|---------|-------|
| **Platform Take** | `stake_volume - payouts - creator_earnings` | Approximates platform revenue per period. Excludes on-chain fees. |
| **Conversion Rate (referral)** | `signups / clicks * 100` | Per-referrer. |

---

## 2. Referral Scorecard Metrics

Source view: `v_referral_performance` (always-fresh SQL view).

| Metric | Column | Definition |
|--------|--------|------------|
| **Total Clicks** | `total_clicks` | All-time clicks on the referrer's link. |
| **Clicks (30d / 7d)** | `clicks_30d`, `clicks_7d` | Clicks in the last 30 or 7 days. |
| **Total Signups** | `total_signups` | Unique referees attributed to this referrer all-time. |
| **Signups (30d / 7d)** | `signups_30d`, `signups_7d` | Attributions created in the last 30 or 7 days. |
| **Active Referrals (all / 30d / 7d)** | `active_referrals_all/30d/7d` | Referees who have logged in at least once in the window. |
| **Activated Count** | `activated_count` | Referees with `referral_attributions.is_activated = true`. |
| **Qualified Count** | `qualified_count` | Referees with `referral_attributions.is_qualified = true` (see §9). |
| **Retained Count** | `retained_count` | Referees with `referral_attributions.is_retained = true` (see §9). |
| **Qualification Rate** | `qualification_rate_pct` | `qualified_count / total_signups * 100`. |
| **Referred Stake Total** | `referred_stake_total` | Sum of `prediction_entries.amount` by all referred users. |
| **Referred Stakes Count** | `referred_stakes_count` | Total number of stakes placed by referred users. |
| **Conversion Rate** | `conversion_rate_pct` | `total_signups / total_clicks * 100`. |

---

## 3. Economy Metrics

Source: `analytics_daily_snapshots` economy columns (same as §1 financial columns).

| Metric | Notes |
|--------|-------|
| **Gross Volume** | Total stake_amount across the period. |
| **Gross Payouts** | Total payout_amount (money returned to winners). |
| **Creator Earnings** | Revenue paid to prediction creators. |
| **Deposits** | Real-money or equivalent credits entering the platform. |
| **Withdrawals** | Real-money or equivalent credits leaving the platform. |
| **Platform Take** | Gross Volume − Payouts − Creator Earnings (proxy for gross margin). Does not account for on-chain gas or payment processor fees. |

---

## 4. Period Filters

| Label | Window | Notes |
|-------|--------|-------|
| `7d` | Last 7 calendar days | Rolling window from today. |
| `30d` | Last 30 calendar days | Default for most views. |
| `90d` | Last 90 calendar days | Quarterly view. |
| `all` | All available data | No date filter applied. |

The period is reflected in the URL query string (`?period=30d`) to allow sharing / bookmarking.

---

## 5. Referral Period Columns

For the referral scorecard, `period` selects which column is used for the "in-period" convenience fields:

| Period | Signups column | Active column |
|--------|----------------|---------------|
| `7d` | `signups_7d` | `active_referrals_7d` |
| `30d` | `signups_30d` | `active_referrals_30d` |
| `all` | `total_signups` | `active_referrals_all` |

---

## 6. Data Freshness

| Data source | Freshness |
|-------------|-----------|
| `analytics_daily_snapshots` | Updated nightly by cron (`runAnalyticsSnapshot`). Backfill available via admin UI. |
| `v_referral_performance` | Live SQL view – always current. |
| `user_stats_daily` | Updated by `recomputeStatsAndAwards` (achievements service). |
| `product_events` | Appended in real-time by server instrumentation and the `/api/v2/events` ingest endpoint. |
| `user_activation_status` | Recomputed daily by `runRetentionCompute` cron for users who signed up in the last 31 days. |
| `referral_attributions` (qualified flags) | Recomputed daily by `runRetentionCompute` cron for attributions within the last 90 days. |

---

## 7. Team-Member Referral Metrics

Source view: `v_team_referral_scorecard` (always-fresh; migration 347).
Time-series source: `referral_daily_snapshots` (per-referrer per-day; computed nightly).

### 7.1 Composite Score

**Formula** (see `server/src/constants/referralScoring.ts`):
```
score = qualified_count × 3.0
      + d7_retained_count × 2.0
      + d30_retained_count × 5.0
      + activated_count × 1.5
      + (stake_volume / 10) × 0.1
      + predictions_created × 0.5
      - suspicious_signups × 5.0
```

Weights are **configurable in code** — changing `DEFAULT_SCORING_WEIGHTS` in `referralScoring.ts`
immediately affects the API leaderboard ranking. See `docs/analytics/team-referral-scoring.md`.

### 7.2 All Team-Member Metrics

| Metric | Column | Definition |
|--------|--------|------------|
| **Total clicks** | `total_clicks` | All-time clicks on the referrer's link (from `referral_clicks`) |
| **Unique IPs** | `unique_ips` | `COUNT(DISTINCT ip)` on `referral_clicks` — anti-gaming signal |
| **Unique sessions** | `unique_sessions` | `COUNT(DISTINCT device_fingerprint/ip/ua)` — rough session dedup |
| **Total signups** | `total_signups` | Unique referees attributed to this referrer |
| **Onboarding completions** | `onboarding_completions` | `product_events` with `event_name='onboarding_completed'` by referred users |
| **Activated** | `activated_count` | Referred users with `referral_attributions.is_activated = true` |
| **Qualified** | `qualified_count` | ≥2 active days + ≥1 economic action within 14d (see §9) |
| **D7 retained** | `d7_retained_count` | Referred users with `user_activation_status.d7_retained = true` |
| **D30 retained** | `d30_retained_count` | Referred users with `user_activation_status.d30_retained = true` |
| **Referred stake volume** | `referred_stake_volume` | `SUM(prediction_entries.amount)` by referred users |
| **Referred predictions created** | `referred_predictions_created` | `product_events WHERE event_name='prediction_created'` by referred users |
| **Referred creator earnings** | `referred_creator_earnings` | `SUM(user_stats_daily.creator_earnings_amount)` for referred users |
| **Referred comments** | `referred_comments_count` | `product_events WHERE event_name='comment_created'` by referred users |
| **Referred likes** | `referred_likes_count` | `product_events WHERE event_name='like_added'` by referred users |
| **Referred tags** | `referred_tags_count` | `product_events WHERE event_name='tag_used'` by referred users |
| **Suspicious signups** | `suspicious_signups_count` | Signups where `referral_attributions.flags->>'suspicious' = true` |
| **Click → signup %** | `click_to_signup_pct` | `total_signups / total_clicks × 100` |
| **Signup → activation %** | `signup_to_activation_pct` | `activated_count / total_signups × 100` |
| **Qualification rate %** | `qualification_rate_pct` | `qualified_count / total_signups × 100` |
| **D7 retention rate %** | `d7_retention_rate_pct` | `d7_retained_count / total_signups × 100` |
| **D30 retention rate %** | `d30_retention_rate_pct` | `d30_retained_count / total_signups × 100` |
| **Composite score** | `composite_score` | See formula above |

---

## 8. Caveats

- **Stake volume** is denominated in the app's internal unit (USD-equivalent). On-chain USDC amounts are tracked separately in `wallet_transactions`.
- **Active Users** counts actions from `user_stats_daily`, which is populated by the achievements cron. If that cron hasn't run for a day, `active_users_count` will be 0 for that day even if users were present.
- **Deposits/Withdrawals** include all completed wallet transactions regardless of currency or channel. Inspect `wallet_transactions` directly for channel-level breakdowns.
- **Platform Take** is a rough proxy. Real margin must account for smart-contract gas, Paystack/Stripe fees, and infrastructure costs tracked outside this system.

---

## 8. Engagement & Retention Metrics

### Weekly Active Economic Users (WAEUs)

**Definition:** Distinct users who placed at least one stake (`user_stats_daily.stakes_count > 0`) in the 7-day window ending on (and including) the snapshot day.

**Source:** `user_stats_daily.stakes_count` aggregated over a rolling 7-day window.
**Column:** `analytics_daily_snapshots.weekly_active_economic_users`
**Computed by:** `upsert_analytics_snapshot(p_day DATE)` PL/pgSQL function.

---

### Activated Users

**Definition:** A user is **activated** when they complete their first economic action — whichever comes first:
- Their first stake (entry in `prediction_entries`)
- Their first prediction created (entry in `predictions`)

**Source:** `user_activation_status` table, `is_activated = true`.
**Columns:** `is_activated BOOLEAN`, `activated_at TIMESTAMPTZ`, `first_stake_at`, `first_prediction_created_at`
**Computed by:** `compute_user_activation(p_user_id UUID)` PL/pgSQL function, called daily by `backfill_user_activation_status`.

---

### D1 / D7 / D30 Retention

**Definition:** A user is **D{N} retained** if they logged in (row exists in `auth_logins`) on at least one day within the D{N} window after signup.

| Flag | Window | Condition |
|------|--------|-----------|
| `d1_retained` | Day 1 | ≥1 login on `signup_day + 1` |
| `d7_retained` | Days 1–7 | ≥1 login between `signup_day + 1` and `signup_day + 7` |
| `d30_retained` | Days 1–30 | ≥1 login between `signup_day + 1` and `signup_day + 30` |

These flags are set to `NULL` (unknown) until the window has fully elapsed. They only become `true` or `false` once the window closes.

**Source:** `user_activation_status` table.
**Computed by:** `compute_user_activation(p_user_id UUID)` and `backfill_user_activation_status(p_days_back INTEGER)`.

---

### Active Days (14-day window)

**Definition:** Number of distinct calendar days within the 14 days following a user's signup on which they logged in.

**Source:** `user_activation_status.active_days_14d`
Used as an input to the qualified referral computation.

---

## 9. Referral Quality Metrics

### Activated Referral

**Definition:** A referred user who has `user_activation_status.is_activated = true` — i.e., they have placed at least one stake or created at least one prediction.

**Column:** `referral_attributions.is_activated`
**Set by:** `compute_qualified_referrals(p_days_back INTEGER)` PL/pgSQL function.

---

### Qualified Referral

**Definition:** A referred user who, **within 14 days of their attributed signup date**, meets ALL of the following criteria:
1. **≥ 2 active days** (distinct days with an `auth_logins` entry) in the 14-day window
2. **≥ 1 economic action** — either a stake (`prediction_entries` row) or a prediction created (`predictions` row)

This is the primary quality signal for referral reward eligibility.

**Column:** `referral_attributions.is_qualified`, `qualified_at`
**Set by:** `compute_qualified_referrals(p_days_back INTEGER)` PL/pgSQL function (daily cron).
**Idempotent:** Once `is_qualified = true`, it is never set back to false.

---

### Retained Referral

**Definition:** A referred user who is both qualified (see above) AND has `user_activation_status.d30_retained = true`.

**Column:** `referral_attributions.is_retained`, `retained_at`
**Set by:** `compute_qualified_referrals(p_days_back INTEGER)` PL/pgSQL function.

---

## 10. Product Events Taxonomy

Events are recorded in the `product_events` table. Server-side events are instrumented directly in service/route code; client-side events are submitted via `POST /api/v2/events` (authenticated, rate-limited to 120 req/min/user).

### Server-side Events (financial / authoritative)

These events are written exclusively server-side and must never be submitted via the client endpoint:

| Event | Idempotency Key Format | Triggered By |
|-------|------------------------|--------------|
| `stake_placed` | `stake_placed:{entry_id}` | `atomicBetPlacement.ts` after successful entry creation |
| `prediction_created` | `prediction_created:{prediction_id}` | `routes/predictions.ts` after successful prediction insert |
| `referred_signup_completed` | `referred_signup_completed:{user_id}` | `routes/referrals.ts` after successful referral attribution |
| `claim_started` | `claim_started:{claim_id}` | Settlement/claim service |
| `claim_completed` | `claim_completed:{claim_id}` | Settlement/claim service |
| `claim_failed` | `claim_failed:{claim_id}` | Settlement/claim service |

### Client-side Events (non-financial, accepted via API)

These events may be submitted by the frontend via `POST /api/v2/events`:

| Event | Idempotency Key Format | Description |
|-------|------------------------|-------------|
| `signup_completed` | `signup_completed:{user_id}` | User completes registration flow |
| `onboarding_completed` | `onboarding_completed:{user_id}` | User completes onboarding steps |
| `login_completed` | *(no key — deduped by session)* | User successfully authenticates |
| `session_started` | `session:{session_id}` | App session begins |
| `prediction_viewed` | `viewed:{prediction_id}:{user_id}:{date}` | User views a prediction |
| `share_clicked` | *(optional)* | User taps share button |
| `tag_used` | *(optional)* | User interacts with a tag |

### Idempotency

All events with an idempotency key are deduplicated at the database level via a unique partial index:

```sql
CREATE UNIQUE INDEX idx_product_events_idempotency
  ON product_events (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

Duplicate inserts (same key) are silently ignored (`ON CONFLICT DO NOTHING`). The service catches PostgreSQL error code `23505` and treats it as a no-op.
