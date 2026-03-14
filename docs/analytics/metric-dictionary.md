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

---

## 7. Caveats

- **Stake volume** is denominated in the app's internal unit (USD-equivalent). On-chain USDC amounts are tracked separately in `wallet_transactions`.
- **Active Users** counts actions from `user_stats_daily`, which is populated by the achievements cron. If that cron hasn't run for a day, `active_users_count` will be 0 for that day even if users were present.
- **Deposits/Withdrawals** include all completed wallet transactions regardless of currency or channel. Inspect `wallet_transactions` directly for channel-level breakdowns.
- **Platform Take** is a rough proxy. Real margin must account for smart-contract gas, Paystack/Stripe fees, and infrastructure costs tracked outside this system.
