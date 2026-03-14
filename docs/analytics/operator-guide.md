# Fan Club Z Analytics — Operator Guide

A practical, non-technical guide for the team. No SQL or code knowledge required.

---

## Where to find the analytics

Log in as an admin and go to **Admin → Analytics** (left sidebar).

You'll see five tabs:

| Tab | What it shows |
|-----|---------------|
| **Overview** | The big-picture numbers: users, stakes, payouts, referrals |
| **Growth** | How the user base is growing day-by-day |
| **Referral** | Which team members are driving the best-quality signups |
| **Engagement** | Money flowing through the platform: stakes, payouts, creator earnings |
| **Ops / Health** | Technical health: is data up to date? Are claims working? |

---

## Choosing a time range

Use the **period buttons** at the top (Last 7 days / Last 30 days / Last 90 days / All time)
or pick a custom **From / To date range** for a specific window.

> **Tip:** After setting your dates, copy the URL from your browser — it's a
> shareable link. Anyone with admin access can open that exact same view.

---

## Quick-start: Report presets

Click the **Presets** button (top right of the dashboard) to jump straight to
a pre-configured view:

| Preset | Good for |
|--------|----------|
| Executive Overview | Weekly all-hands or board updates |
| Growth Trends | Measuring referral campaigns over a quarter |
| Referral / Team | Reviewing which team member drove the most quality signups |
| Creator Economy | Understanding platform economics and take-rate |
| Ops / Claim Health | Checking platform is healthy before a campaign launch |

---

## Understanding the numbers

### New Users
People who signed up in the selected period. Does **not** include existing users who logged back in.

### Active Users
Users who placed a stake or posted a comment on a given day. Passive browsing is not counted.

### Stake Volume
Total dollar value wagered across all predictions.

### Platform Take
`Stake Volume − Payouts − Creator Earnings`. This is an approximation of platform revenue.
It excludes payment processing fees and demo-mode stakes (which do not involve real money).

### Referral Signups
Users who signed up using a team member's referral link. Click **Referral** tab for a
per-person breakdown.

### Composite Score (Referral tab)
A quality score for each team member's referred signups. It rewards:
- Users who stayed 30 days (biggest reward)
- Users who became economically active (staked or created predictions)
- Users who stayed 7 days

It **penalises** suspicious-looking signups (bot-like or duplicate accounts).
Raw signup count is visible but not used for ranking.

---

## Exporting data to CSV

Every tab has a green **Export CSV** button at the bottom right.
It downloads the exact rows you're looking at — what you see is what you get.

> **Note:** The export reflects the current filter settings (period, date range).
> Apply your filters first, then export.

---

## Is the data fresh?

Go to the **Ops / Health** tab and look at **Data Freshness**.
- Green "Snapshots fresh" badge = yesterday's data is available (normal).
- Amber "Snapshots stale" badge = the nightly computation hasn't run. Check with engineering.

Data is typically updated daily at approximately **00:10 UTC**.

Today's partial data is **not** available until the cron runs at midnight.
If you need real-time data for a specific user, use the individual user pages in Admin → Users.

---

## Something looks wrong

**Number seems too low?**
- Check the period filter. "Last 7 days" only shows the last 7 calendar days.
- Check that the analytics backfill has been run. If the team recently deployed new analytics
  tables, a backfill is needed. Ask engineering to run it from **Admin → Analytics → Team Referrals → Backfill**.

**Number seems too high?**
- Stake volume includes demo-mode transactions. If you're looking at real-money activity only,
  wallet-mode filtering is not yet available (planned).
- Referral click counts are raw (not deduplicated). Conversion rate uses clicks as the denominator,
  so it may be lower than expected if the same link was clicked many times.

**Claim health showing failures?**
- Go to the **Ops / Health** tab. If Claim success rate is below 95%, contact engineering.
  This usually means a settlement payout pipeline issue.

---

## Glossary

| Term | Meaning |
|------|---------|
| Snapshot | A pre-computed row of daily metrics stored for fast retrieval |
| Backfill | Recomputing historical snapshots for past dates |
| Activated referral | A referred user who placed their first stake or created their first prediction |
| Qualified referral | A referred user who was active for ≥2 days AND took an economic action within 14 days |
| D7 retained | A referred user who was still active 7 days after signup |
| D30 retained | A referred user who was still active 30 days after signup |
| Platform take | Stake volume minus payouts to winners minus creator earnings |
| Composite score | A quality metric combining retention, activation, stake volume, and suspicious-signup penalties |

---

## Known limitations (honest caveats)

1. **Demo-mode not separated**: Stake volume and payout figures include demo-mode (fake-money)
   transactions. Real-money segmentation is planned but not yet available.

2. **Today's data**: Daily snapshots are computed at midnight UTC. Data for the current day
   is not available in the dashboard until the next day.

3. **Referral click counts are raw**: The same person clicking a link 5 times counts as 5 clicks.
   Only signups and qualified counts are deduplicated.

4. **No BI tool integration yet**: The dashboard is built directly into the admin panel.
   For more advanced analysis (custom cohorts, SQL queries, funnel visualisation), the team
   can connect Metabase or PostHog directly to the Supabase PostgreSQL database.

5. **Cohort / LTV analysis**: Detailed cohort lifetime value analysis is available on the
   Team Referrals page (per-referrer cohort view) but is not yet surfaced at the platform level.
