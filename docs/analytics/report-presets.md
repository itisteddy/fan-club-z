# Analytics Report Presets

Five one-click presets are built into the admin analytics dashboard (`/admin/analytics`).
Clicking a preset updates the URL search params — the resulting URL is fully shareable and
can be bookmarked or sent to a colleague.

---

## Available Presets

| Preset | Tab | Period | Purpose |
|--------|-----|--------|---------|
| **Executive Overview** | Overview | 30d | High-level KPIs for the past 30 days. Best for weekly leadership reviews. |
| **Growth Trends** | Growth | 90d | Cumulative user growth and referral funnel over the past quarter. |
| **Referral / Team Performance** | Referral | 30d | Team-member leaderboard ranked by composite quality score. |
| **Creator Economy** | Engagement | 30d | Stake volume, payouts, creator earnings and platform take-rate for the past month. |
| **Ops / Claim Health** | Ops | 7d | Platform health for the past 7 days: data freshness, claim success rate, event throughput. |

---

## URL Structure

Each preset sets three URL params when applied:

```
/admin/analytics?tab=<tab>&period=<period>&preset=<preset-id>
```

Example shareable URLs:

```
Executive:   /admin/analytics?tab=overview&period=30d&preset=executive
Growth:      /admin/analytics?tab=growth&period=90d&preset=growth
Referral:    /admin/analytics?tab=referral&period=30d&preset=referral
Creator:     /admin/analytics?tab=engagement&period=30d&preset=creator
Ops:         /admin/analytics?tab=ops&period=7d&preset=ops
```

You can also combine a preset's tab/period with a custom date range by additionally adding
`dateFrom` and `dateTo` params. When `dateFrom` is present, it overrides the rolling period.

```
/admin/analytics?tab=overview&dateFrom=2025-01-01&dateTo=2025-03-31
```

---

## Adding a New Preset

1. Open `client/src/pages/admin/AdminAnalyticsDashboard.tsx`.
2. Add an entry to the `REPORT_PRESETS` array (near the top of the file):

```typescript
{
  id:          'my-preset',
  label:       'My Custom Report',
  description: 'What this preset shows',
  tab:         'engagement',
  period:      '90d',
}
```

3. No backend changes are needed — presets are purely a frontend URL bookmark pattern.

---

## Known Limitations / Next Up

- **Wallet-mode segmentation**: All current presets aggregate demo and real-money activity together.
  Once the `wallet_mode` filter is added to `analytics_daily_snapshots`, presets can include a
  `walletMode=real` param to isolate real-money data.

- **Optional BI integration (Metabase / PostHog)**: The five presets map naturally to five
  Metabase questions or PostHog dashboards. Metabase can query Supabase directly via its
  PostgreSQL connector; just point it at the `analytics_daily_snapshots` and
  `v_team_referral_scorecard` views.

- **More advanced cohort / LTV analysis**: The current presets show aggregate metrics.
  A future "Cohort LTV" preset would group referred users by their signup week/month,
  then show cumulative stake volume per cohort — enabling proper customer lifetime value
  estimates. This requires the `referral_attributions` table joined with `user_stats_daily`.

---

## Scheduling Weekly Report Emails

The server includes a weekly report cron in `server/src/cron/weeklyReport.ts`.
To receive weekly reports in Slack:

1. Create a Slack Incoming Webhook URL.
2. Set `SLACK_ANALYTICS_WEBHOOK_URL=https://hooks.slack.com/services/…` in your server's `.env`.
3. Register `runWeeklyReport` in the main cron scheduler to fire every Monday at 08:00 UTC:

```typescript
import { runWeeklyReport } from './cron/weeklyReport';
cron.schedule('0 8 * * 1', runWeeklyReport);
```

The report summary is also written to `audit_log` with `action='analytics.weekly_report'`
regardless of the Slack setting, so historical weekly snapshots are preserved in the database.
