# Fan Club Z – Analytics Implementation Notes

## Architecture overview

```
Postgres (Supabase)
  ├── analytics_daily_snapshots   ← nightly snapshot table (migration 344)
  ├── v_referral_performance      ← live SQL view (migration 344)
  ├── user_stats_daily            ← per-user daily stats (migration 115/340)
  ├── referral_clicks             ← raw click log (migration 202)
  ├── referral_attributions       ← signup attribution + activation/qualification flags (203/346)
  ├── user_activation_status      ← per-user D1/D7/D30 retention window (migration 346)
  ├── referral_daily_snapshots    ← per-referrer per-day fact table (migration 347)
  ├── v_team_referral_scorecard   ← live all-time team scorecard (migration 347)
  └── wallet_transactions         ← financial ledger

Express server
  └── /api/v2/admin/analytics/*   ← analytics routes (server/src/routes/admin/analytics.ts)
        ├── GET /overview         ← time-series daily snapshots (dateFrom/dateTo supported)
        ├── GET /referrals        ← per-referrer scorecard from v_referral_performance
        ├── GET /economy          ← financial breakdown
        ├── GET /ops              ← platform health: freshness, claim health, event throughput
        ├── GET /export/csv       ← CSV download (referrals | users | snapshots)
        └── POST /backfill        ← re-compute snapshots for a date range

  └── /api/v2/admin/analytics/team/*  ← team referral routes (teamAnalytics.ts)
        ├── GET /leaderboard          ← quality-ranked leaderboard
        ├── GET /:memberId/scorecard  ← full all-time scorecard per member
        ├── GET /:memberId/cohort     ← cohort breakdown per member
        ├── GET /:memberId/trend      ← daily time-series per member
        ├── GET /export/csv           ← full team export
        └── POST /backfill            ← compute referral_daily_snapshots

React client
  ├── /admin/analytics                 ← AdminAnalyticsDashboard (5-tab unified dashboard)
  │     tabs: Overview / Growth / Referral / Engagement / Ops
  ├── /admin/analytics/team            ← TeamAnalyticsPage (leaderboard)
  ├── /admin/analytics/team/:memberId  ← TeamMemberDetailPage (full scorecard)
  └── /admin/analytics/referrals       ← ReferralScorecardsPage (legacy, still accessible)
```

---

## Files added / modified

### New files
| File | Purpose |
|------|---------|
| `server/migrations/344_analytics_daily_snapshots.sql` | DB: snapshot table, `v_referral_performance`, upsert function |
| `server/migrations/346_user_activation_retention.sql` | DB: `user_activation_status`, `referral_attributions` flags, qualified-referral RPC |
| `server/migrations/347_team_referral_analytics.sql` | DB: `referral_daily_snapshots`, `v_team_referral_scorecard`, snapshot RPCs |
| `server/src/routes/admin/analytics.ts` | All platform analytics API routes (overview, ops, export, backfill) |
| `server/src/routes/admin/teamAnalytics.ts` | Team-member referral analytics routes (leaderboard, scorecard, cohort, trend) |
| `server/src/cron/analyticsSnapshot.ts` | Nightly cron: `upsertDailySnapshot` |
| `server/src/cron/retentionCompute.ts` | Daily cron: retention windows + qualified referral flags + referral snapshots |
| `server/src/cron/weeklyReport.ts` | Weekly cron: structured report persisted to audit_log + optional Slack hook |
| `server/src/constants/referralScoring.ts` | TypeScript composite-score weights + `computeCompositeScore` / `getScoreBreakdown` |
| `client/src/pages/admin/AdminAnalyticsDashboard.tsx` | Unified 5-tab analytics dashboard |
| `client/src/pages/admin/TeamAnalyticsPage.tsx` | Team referral leaderboard |
| `client/src/pages/admin/TeamMemberDetailPage.tsx` | Full per-member scorecard + cohort + sparklines |
| `client/src/pages/admin/AnalyticsPage.tsx` | Legacy analytics overview (preserved) |
| `client/src/pages/admin/ReferralScorecardsPage.tsx` | Legacy referral scorecard (preserved) |
| `server/src/__tests__/analyticsHelpers.test.ts` | Unit tests: CSV helpers, period math, summary aggregation |
| `server/src/__tests__/referralScoring.test.ts` | Unit tests: composite score formula, breakdown, quality guarantees |
| `server/src/__tests__/analyticsUrlState.test.ts` | Unit tests: URL filter state serialisation, preset application |
| `docs/analytics/metric-dictionary.md` | All metric definitions |
| `docs/analytics/team-referral-scoring.md` | Composite score formula documentation |
| `docs/analytics/report-presets.md` | Saved report presets + shareable URL structure |
| `docs/analytics/operator-guide.md` | Non-technical operator guide |
| `docs/analytics/implementation-notes.md` | This file |

### Modified files
| File | Change |
|------|--------|
| `server/src/routes/admin/index.ts` | Added `teamAnalyticsRouter` at `/analytics/team` |
| `server/src/index.ts` | Added analytics cron chain (snapshot → retention → weekly) |
| `client/src/App.tsx` | Added routes for new dashboard + team analytics pages |
| `client/src/components/admin/AdminLayout.tsx` | Added "Team Referrals" nav item |

---

## Database migration

**Run this once in Supabase SQL editor or via migration tooling:**

```sql
-- File: server/migrations/344_analytics_daily_snapshots.sql
```

Creates:
- `public.analytics_daily_snapshots` – platform snapshot table
- `public.v_referral_performance` – live referral scorecard view
- `public.upsert_analytics_snapshot(p_day DATE)` – idempotent upsert function

The migration is **safe to run multiple times** (all `IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO UPDATE`).

### Backfilling historical data

After running the migration, populate historical snapshots from the admin UI:
1. Go to `/admin/analytics`
2. Click **Backfill Last 90 Days** (shown when no data exists)
3. Or call `POST /api/v2/admin/analytics/backfill` with `{ startDay, endDay }`

Or directly in SQL:
```sql
SELECT upsert_analytics_snapshot(d::date)
FROM generate_series(
  current_date - interval '90 days',
  current_date - interval '1 day',
  interval '1 day'
) AS d;
```

---

## API reference

All routes require admin auth (same `requireAdmin` middleware as other admin routes).

### Platform analytics `/api/v2/admin/analytics`

#### GET /overview
```
?period=7d|30d|90d|all   (default: 30d)
?dateFrom=YYYY-MM-DD      (overrides period when set)
?dateTo=YYYY-MM-DD
```
Returns `{ data: { rows: DailyRow[], summary: Summary, period, rowCount } }`.

#### GET /ops
```
?period=7d|30d|90d|all   (default: 7d)
?dateFrom=YYYY-MM-DD
?dateTo=YYYY-MM-DD
```
Returns `{ data: { dataFreshness, predictionHealth, claimHealth, economyHealth, eventThroughput } }`.

#### GET /referrals
```
?period=7d|30d|all         (default: 30d)
?sort=total_signups|active_referrals|referred_stake_total|conversion_rate_pct
?limit=1-200               (default: 50)
?offset=0
```
Returns `{ data: { items: ReferralRow[], total, period, limit, offset } }`.

#### GET /economy
```
?period=7d|30d|90d|all   (default: 30d)
```
Returns `{ data: { rows: EconomyRow[], summary: EconomySummary, period } }`.

#### GET /export/csv
```
?type=referrals|users|snapshots   (required)
?period=7d|30d|90d|all            (default: all)
?limit=1-10000                     (default: 5000)
?actorId=<uuid>
```
Returns `text/csv` with `Content-Disposition: attachment`. Logged to `audit_log`.

#### POST /backfill
```json
{ "startDay": "2025-01-01", "endDay": "2025-03-13", "actorId": "<uuid>" }
```
Calls `upsertDailySnapshot` for each day in range (max 365 days).

---

### Team referral analytics `/api/v2/admin/analytics/team`

#### GET /leaderboard
```
?period=7d|30d|90d|all    (default: 30d)
?dateFrom=YYYY-MM-DD
?dateTo=YYYY-MM-DD
?memberId=<uuid>           (filter to single member)
?refCode=<code>            (filter by referral code)
?limit=1-200               (default: 50)
?offset=0
?sort=composite_score|total_signups|qualified_count|d30_retained_count
```
Returns quality-ranked leaderboard with composite score recomputed from current TS weights.

#### GET /:memberId/scorecard
Full all-time metrics for one team member. Composite score recomputed live.

#### GET /:memberId/cohort
```
?granularity=week|month   (default: week)
```
Referees grouped by signup week/month with activation/retention rates per cohort.

#### GET /:memberId/trend
```
?period=7d|30d|90d|all
?dateFrom=YYYY-MM-DD
?dateTo=YYYY-MM-DD
```
Daily time-series from `referral_daily_snapshots` for sparklines.

#### GET /export/csv
Full leaderboard export (all members, all-time metrics + scoring breakdown).

#### POST /backfill
```json
{ "daysBack": 90 }
```
Calls `backfill_referral_snapshots(daysBack)` RPC (migration 347).

---

## Cron schedule

The analytics snapshot runs:
1. **Once at server startup** – populates yesterday's snapshot
2. **Every 24 hours** thereafter

It calls `upsert_analytics_snapshot` via Supabase RPC. If migration 344 hasn't been run, it logs a warning and returns without crashing.

---

## Filterable / shareable URLs

Both analytics pages use `useSearchParams` so filters are reflected in the URL:

| Page | URL example |
|------|-------------|
| Overview | `/admin/analytics?period=30d` |
| Referral scorecards | `/admin/analytics/referrals?period=30d&sort=active_referrals&page=0` |

Sharing the URL preserves the exact view.

---

## CSV exports

Three export types available from the **Export CSV** button:

| Type | Columns | Notes |
|------|---------|-------|
| `snapshots` | All columns from `analytics_daily_snapshots` | Useful for external BI tools |
| `referrals` | Referral scorecard columns | Full all-time data regardless of period filter |
| `users` | id, username, email, created_at, referral_code, etc. | Filtered by period |

Exports are logged to `admin_audit_log` with action `analytics.export.<type>`.

---

## Extending the system

### Adding a new daily metric
1. Add the column to `analytics_daily_snapshots` in a new migration
2. Update `upsert_analytics_snapshot` function to populate it
3. Surface it in `/api/v2/admin/analytics/overview` response
4. Add it to `AnalyticsPage.tsx` stat cards / table

### Adding a new referral metric
1. Add the column/expression to `v_referral_performance` view (recreate with `CREATE OR REPLACE`)
2. Surface it in `/api/v2/admin/analytics/referrals` response
3. Add it to `ReferralScorecardsPage.tsx` table

### Adding a cron-based metric (not from user_stats_daily)
Add a new `SELECT ... INTO` block inside `upsert_analytics_snapshot` in the migration/function body.

---

## Compatibility notes

- The analytics route fails gracefully (returns empty data) if migration 344 hasn't been applied, so it's safe to deploy server code before running the migration.
- `v_referral_performance` depends on `referral_clicks`, `referral_attributions`, `auth_logins`, and `prediction_entries` – all of which exist from earlier migrations (202, 203, 204, baseline).
- The cron uses `supabase.rpc('upsert_analytics_snapshot')` which works with the Supabase JS client (no raw pg pool required).

---

## Testing

### Manual smoke test (after migration)
```bash
# 1. Trigger backfill for last 7 days
curl -X POST https://your-server/api/v2/admin/analytics/backfill \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"startDay":"2025-03-07"}'

# 2. Fetch overview
curl "https://your-server/api/v2/admin/analytics/overview?period=7d&actorId=$ADMIN_USER_ID" \
  -H "x-admin-key: $ADMIN_API_KEY"

# 3. Fetch referrals
curl "https://your-server/api/v2/admin/analytics/referrals?period=30d&sort=total_signups" \
  -H "x-admin-key: $ADMIN_API_KEY"

# 4. CSV export
curl "https://your-server/api/v2/admin/analytics/export/csv?type=snapshots&period=30d" \
  -H "x-admin-key: $ADMIN_API_KEY" -o snapshots.csv
```

### Verify snapshot data in DB
```sql
SELECT day, new_users_count, total_stakes_count, total_stake_amount
FROM analytics_daily_snapshots
ORDER BY day DESC
LIMIT 10;
```
