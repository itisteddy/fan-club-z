# Fan Club Z — Team-Member Referral Scoring

This document defines the composite score formula used in the Team Referral Leaderboard,
explains every metric tracked, and documents the anti-gaming protections in place.

---

## 1. Philosophy

Team members should be ranked by **referral quality**, not volume.
A member who brings in 10 users who activate, stake, and stay is more valuable
than one who brings in 100 users who sign up and immediately churn.

The composite score is designed so that:
- **You cannot win by generating clicks or signups that don't convert.**
- D30 retention carries the highest per-unit weight.
- Suspicious/low-quality signups subtract from the score.
- Raw metrics (signups, clicks, volume) are still visible but do not drive the ranking.

---

## 2. Composite Score Formula

```
score =  qualified_count           × 3.0
       + d7_retained_count         × 2.0
       + d30_retained_count        × 5.0
       + activated_count           × 1.5
       + (stake_volume / 10)       × 0.1
       + predictions_created       × 0.5
       + suspicious_signups_count  × (-5.0)
```

### Component definitions

| Component | Weight | Definition |
|-----------|--------|------------|
| `qualified_count` | **3.0** | Referred users who, within 14 days of signup, had ≥2 distinct login days AND ≥1 economic action (stake or prediction). See §4. |
| `d7_retained_count` | **2.0** | Referred users who logged in at least once during days 1–7 post-signup. |
| `d30_retained_count` | **5.0** | Referred users who logged in at least once during days 1–30 post-signup. Highest weight — strongest long-term signal. |
| `activated_count` | **1.5** | Referred users who placed their first stake or created their first prediction. |
| `stake_volume / 10 × 0.1` | **0.01 / $1** | Every $10 of cumulative stake volume by referred users = 0.1 point. Caps naturally because you need real economic activity. |
| `predictions_created` | **0.5** | Predictions created by referred users. Counts post-migration 345 events. |
| `suspicious_signups_count` | **-5.0** | Each suspicious signup (device/IP rate limit exceeded at attribution) deducts 5 points. |

### Example calculation

A team member with:
- 8 qualified referrals
- 5 D7-retained referrals (some overlap with qualified)
- 3 D30-retained referrals
- 12 activated referrals
- $240 referred stake volume
- 4 predictions created by referred users
- 1 suspicious signup

```
score = 8×3.0 + 5×2.0 + 3×5.0 + 12×1.5 + (240/10)×0.1 + 4×0.5 + 1×(–5.0)
      = 24.0  + 10.0  + 15.0  + 18.0   + 2.4           + 2.0   – 5.0
      = 66.4
```

---

## 3. How to Change the Weights

Weights are defined in:
```
server/src/constants/referralScoring.ts → DEFAULT_SCORING_WEIGHTS
```

They are also hard-coded in the SQL view for performance:
```sql
-- v_team_referral_scorecard (migration 347)
ROUND(
    COALESCE(rl.qualified_count,    0)     *  3.0
  + COALESCE(rl.d7_retained_count,  0)     *  2.0
  + COALESCE(rl.d30_retained_count, 0)     *  5.0
  + COALESCE(rl.activated_count,    0)     *  1.5
  + (COALESCE(sk.stake_volume,      0) / 10.0) * 0.1
  + COALESCE(ss2.predictions_created, 0)   *  0.5
  - COALESCE(rl.suspicious_count,   0)     *  5.0
, 2) AS composite_score
```

**To change weights:**
1. Edit `DEFAULT_SCORING_WEIGHTS` in `server/src/constants/referralScoring.ts`
2. Update the SQL expression in migration 347 (re-run the view `CREATE OR REPLACE VIEW v_team_referral_scorecard`)
3. Trigger a backfill from the admin UI → Team Referrals → "Recompute (90d)" to regenerate `referral_daily_snapshots.composite_score`

The API **always recomputes the score live** using the TypeScript constants, so the leaderboard
ranking is immediately updated after step 1. The SQL pre-computation is a convenience only.

---

## 4. Metric Definitions

### 4.1 Click Funnel

| Metric | Source | Anti-gaming |
|--------|--------|-------------|
| **Total clicks** | `referral_clicks` rows with this `ref_code` | Raw count |
| **Unique IPs** | `COUNT(DISTINCT ip)` on `referral_clicks` | Flags bot farms (many clicks from same IP) |
| **Unique sessions** | `COUNT(DISTINCT COALESCE(device_fingerprint, ip, ua))` | Rough session deduplication |

### 4.2 Signup Funnel

| Metric | Source | Notes |
|--------|--------|-------|
| **Total signups** | `referral_attributions.referrer_user_id` | Each referee counted once (UNIQUE on `referee_user_id`) |
| **Signups 7d / 30d** | `attributed_at` window filter | Recent attribution windows |
| **Onboarding completions** | `product_events WHERE event_name='onboarding_completed'` | Post-migration 345 only |

### 4.3 Quality Lifecycle

| Metric | Source | Computed by |
|--------|--------|-------------|
| **Activated** | `referral_attributions.is_activated` | `compute_qualified_referrals()` daily cron |
| **Qualified** | `referral_attributions.is_qualified` | `compute_qualified_referrals()` daily cron |
| **D7 retained** | `user_activation_status.d7_retained = true` | `compute_user_activation()` daily cron |
| **D30 retained** | `user_activation_status.d30_retained = true` | `compute_user_activation()` daily cron |

**Qualified referral definition** (as implemented in `compute_qualified_referrals` SQL function):
A referred user who, within 14 days of `attributed_at`, satisfies ALL of:
1. ≥ 2 distinct calendar days with an `auth_logins` row
2. ≥ 1 economic action:
   - A row in `prediction_entries` (stake placed), OR
   - A row in `product_events WHERE event_name = 'prediction_created'`

### 4.4 Economic Impact

| Metric | Source | Notes |
|--------|--------|-------|
| **Referred stake volume** | `SUM(prediction_entries.amount)` for referred users | All-time, all statuses |
| **Referred stakes count** | `COUNT(prediction_entries)` for referred users | |
| **Referred predictions created** | `COUNT(product_events)` where `event_name='prediction_created'` | Post-migration 345 only |
| **Referred creator earnings** | `SUM(user_stats_daily.creator_earnings_amount)` for referred users | |

### 4.5 Social Engagement

| Metric | Source | Notes |
|--------|--------|-------|
| **Comments** | `product_events WHERE event_name='comment_created'` | Requires client or server instrumentation |
| **Likes** | `product_events WHERE event_name='like_added'` | |
| **Tags** | `product_events WHERE event_name='tag_used'` | |

> Note: Social events (`comment_created`, `like_added`, `tag_used`) are in the allowed event
> list but not yet fully instrumented server-side. Counts may be low for historical data.
> They do not contribute to the composite score (no weight assigned).

---

## 5. Anti-Gaming Protections

| Protection | Implementation |
|------------|---------------|
| **Unique user counting** | All lifecycle counts use `DISTINCT referee_user_id` — a user who is referred multiple times is only counted once (UNIQUE constraint on `referral_attributions.referee_user_id`) |
| **IP-rate-limit enforcement** | Attribution route checks `REFERRAL_MAX_SIGNUPS_PER_IP_DAY` (default: 10) — excess signups are flagged in `referral_attributions.flags->>suspicious` |
| **Device-fingerprint limits** | Attribution route checks `REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY` (default: 5) — excess flagged as suspicious |
| **Suspicious penalty in score** | Each suspicious signup deducts **5 points** from composite score |
| **Minimum 14-day qualification window** | Qualification requires economic activity within 14 days — impossible to game with instant self-referral |
| **Session deduplication for clicks** | `unique_sessions` counts `COUNT(DISTINCT device_fingerprint / ip / ua)` — not raw click count |
| **Self-referral prevention** | Attribution route validates `referrer_user_id != referee_user_id` |
| **No score from raw signups** | Raw `total_signups` has zero weight in the composite formula — high signup volume with no retention yields 0 score from signups |

---

## 6. Cohort Analysis

The cohort view (`/admin/analytics/team/:memberId`) groups referred users by their
**signup week or month**, showing:

| Column | Definition |
|--------|------------|
| Cohort start | First day of the signup week/month |
| Cohort size | Users who signed up in this cohort |
| Activated | Users with `is_activated = true` |
| Qualified | Users with `is_qualified = true` |
| D7 / D30 retained | Users with `d7_retained / d30_retained = true` |
| Stake volume | Total stakes placed by this cohort |

**Important:** D7 and D30 retention rates are only meaningful once the window has fully elapsed.
- D7 window: signup_day + 7 days
- D30 window: signup_day + 30 days

Cohorts from the last 30 days will show 0% D30 retention until the window closes.

---

## 7. Data Freshness

| Data | Updated |
|------|---------|
| `v_team_referral_scorecard` (view) | Live — always current at query time |
| `referral_daily_snapshots` | Nightly via `runRetentionCompute()` cron (`backfill_referral_snapshots(90)`) |
| `referral_attributions.is_activated/qualified/retained` | Nightly via `compute_qualified_referrals(90)` |
| `user_activation_status.d7/d30_retained` | Nightly via `backfill_user_activation_status(31)` |

Manual recompute available via: Admin → Team Referrals → "Recompute (90d)" button.

---

## 8. SQL Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `upsert_referral_snapshot` | `(p_referrer_id UUID, p_day DATE) → VOID` | Idempotent upsert of one referrer/day row |
| `backfill_referral_snapshots` | `(p_days_back INTEGER DEFAULT 90) → INTEGER` | Bulk backfill; returns row count processed |

Both defined in `server/migrations/347_team_referral_analytics.sql`.

---

## 9. Leaderboard Filters

| Filter | Parameter | Notes |
|--------|-----------|-------|
| Period | `period=7d\|30d\|90d\|all` | Rolling window filter on signup attribution date |
| Date range | `dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` | Explicit cohort window |
| Team member | `memberId=uuid` | Show only one member |
| Referral code | `refCode=string` | Show only signups with this code |
| Sort column | `sort=composite_score\|total_signups\|...` | Default: `composite_score DESC` |
| Search | Client-side | Filter displayed rows by name or code |

URL is shareable: all filters are reflected in query parameters.

---

## 10. API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v2/admin/analytics/team/leaderboard` | Paginated leaderboard |
| `GET` | `/api/v2/admin/analytics/team/:memberId/scorecard` | Single member all-time scorecard |
| `GET` | `/api/v2/admin/analytics/team/:memberId/cohort` | Cohort breakdown by signup week/month |
| `GET` | `/api/v2/admin/analytics/team/:memberId/trend` | Daily time-series from `referral_daily_snapshots` |
| `GET` | `/api/v2/admin/analytics/team/export/csv` | CSV export of leaderboard |
| `POST` | `/api/v2/admin/analytics/team/backfill` | Trigger `backfill_referral_snapshots` |

All require admin authentication (`requireAdmin` middleware).
