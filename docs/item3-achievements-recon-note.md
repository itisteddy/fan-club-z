# Item 3 Recon Note: Achievements Metrics Sources

Canonical sources chosen for Item 3 metrics:

- Stakes (`stakes_count`, `stake_amount`, `markets_participated_count`): `position_stake_events`
  - authoritative per top-up action (Item 2)
  - supports daily aggregation and audit trail
- Payouts (`payouts_amount`): `wallet_transactions`
  - credit rows with payout semantics (`type='payout'` and/or payout channels), completed status only
- Creator earnings (`creator_earnings_amount`): `wallet_transactions`
  - creator earnings credits recorded via Item 1 (`to_account='CREATOR_EARNINGS'` and legacy `channel='creator_fee'` compatibility)
- Comments (`comments_count`): `comments`
  - counts non-deleted comments (`is_deleted=false`) by `user_id` and `created_at`

Active profile surface:

- UI: `client/src/pages/ProfilePageV2.tsx`
- API profile route: `GET /api/v2/users/:id` in `server/src/routes/users.ts`

Scheduler / jobs pattern available:

- In-process cron jobs exist in `server/src/cron/*`, started from `server/src/index.ts`
- For this item, a protected admin recompute endpoint is added for manual/staging execution and future scheduler wiring.
