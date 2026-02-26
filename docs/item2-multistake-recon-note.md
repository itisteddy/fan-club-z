# Item 2 Recon Note (Multi-Stake Top-Ups)

- Pricing model: pool-based pari-mutuel with fee-adjusted post-stake odds.
- Canonical pricing functions: `shared/src/poolMath.ts` (`getPostOddsMultiple`, `getPayoutPreview`).
- User position table today: `prediction_entries` (aggregated row per `user_id + prediction_id + option_id` when top-up logic updates the same row).
- Pool totals storage:
  - Market total pool: `predictions.pool_total`
  - Outcome pool: `prediction_options.total_staked`
  - Display odds on options: `prediction_options.current_odds`
- Demo top-up restriction source (before Item 2): backend duplicate-entry check in `server/src/routes/predictions.ts` (`POST /api/v2/predictions/:id/entries`).
- Real/crypto path: `server/src/routes/predictions/placeBet.ts` already supports same-outcome top-up via update of existing `prediction_entries` row.

