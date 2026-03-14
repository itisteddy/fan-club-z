# Post-Deploy Staging Runbook

## 1. Migrations

Run in order:

```
344_analytics_daily_snapshots.sql
345_product_events.sql
346_retention_qualified_referrals.sql
347_team_referral_analytics.sql
```

## 2. Server boot

- [ ] Server starts without errors
- [ ] Logs show: `✅ Analytics daily snapshot cron started`
- [ ] Logs show: `✅ Retention + qualified-referral cron started`

## 3. Smoke checklist

Run [staging_smoke_checklist.md](./staging_smoke_checklist.md) in order.

## 4. Controlled analytics activity

Create:

- 2 team members (referrers with referral codes)
- 2 referred users (via `?ref=`)
- 1 organic user (no ref)
- 1 prediction
- 2 stakes (by different users)

## 5. Verify dashboard metrics

- [ ] Overview tab reflects new users, stakes, predictions
- [ ] Referral/team scorecards show expected counts
- [ ] CSV export includes new data

---

## Results report (4 buckets)

### Core regression issues

_List any signup/login/referral/prediction/stake/settlement/claim/wallet failures._

### Analytics data issues

_List any missing events, wrong counts, or stale snapshots._

### Cron / backfill issues

_List any cron failures, backfill errors, or RPC timeouts._

### Dashboard / export / filter issues

_List any UI errors, CSV problems, or filter bugs._
