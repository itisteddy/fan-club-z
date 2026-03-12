# Zaurum Wallet Phase A3: Multiple Stakes + Recalculated Quote/Payout

## Scope Lock (Implemented)
- Allow additional stake on same market/outcome using existing top-up path.
- Keep quote math canonical in `server/src/services/stakeQuote.ts`.
- Keep API backward-compatible (no endpoint rename).
- Keep UI changes minimal and localized to the existing placement modal.

## Contract Notes (A3)
Quote endpoint remains:
- `GET /api/v2/predictions/:id/quote?outcomeId=<uuid>&amount=<number>&mode=demo|real`

Response keeps existing fields and now also includes alias fields for explicit current/projected values:
- `quote.current` + `quote.after` (existing)
- `quote.currentPosition`
- `quote.currentEstimatedPayout`
- `quote.additionalStakeAmount`
- `quote.projectedPositionAfterStake`
- `quote.projectedEstimatedPayoutAfterStake`

No breaking contract changes were introduced.

## Staging Validation Checklist (A3)
Use staging only, never prod.

### Fixtures
- Reuse A2 fixture users and market documented in `docs/zaurum_wallet_phase_a2_fixtures.md`.

### Manual Steps
1. Login as participant A in staging.
2. Open fixture market from Discover and note initial values in stake modal:
   - Current position
   - After this stake
   - Estimated payout
3. Place first stake on outcome X.
4. Re-open same market, same outcome X, enter second stake amount.
5. Verify pre-confirm quote block shows:
   - Current position equals first stake
   - After this stake equals first + second stake
   - Projected payout updates (not identical to first quote unless mathematically expected)
6. Confirm second stake.
7. Verify post-submit:
   - Success reflects updated position/payout estimate
   - Prediction details reflects aggregated position (not corrupted duplicate UI state)
8. Repeat market entry via:
   - Discover -> Prediction detail
   - Stakes -> Prediction detail
   - Completed -> Prediction detail
   and confirm routing/context remain intact.

### Expected Results
- Same-outcome top-ups are accepted.
- Quote reflects current and projected values before confirm.
- After submit, aggregated position/payout state updates.
- No route break from Discover/Stakes/Completed.

## Local Test Run (A3)
- `npm --prefix server run test -- stakeQuote.test.ts`
- Result: PASS

## A4 Carry-Over Items
- If required, unify/clean quote field naming at API boundary (deferred; no rename in A3).
- Add broader integration tests for `place-bet` DB mutation path with mocked Supabase transactional edge cases.
- Evaluate hardening of fallback create-on-topup behavior if duplicate entry rows are observed in staging under race conditions.

## Actual Staging Results (2026-03-12)
Validation executed against `https://fanclubz-backend-staging.onrender.com` using a fresh fixture market from `docs/fixtures.md`:
- `predictionId`: `4303b114-77b7-4a10-b232-df31be45ae56`
- `optionId`: `ea20f734-c5f1-4479-b947-981acf62bbaf`

Flow executed:
1. Faucet + wallet summary for new staging participant.
2. Quote before first stake (demo mode), place first stake (`10`).
3. Quote before second stake, place second stake (`15`) on same outcome.
4. Quote after second stake to detect stale post-submit state.
5. Verify DB rows (`prediction_entries`, `wallet_transactions`, `prediction_options`) and route APIs.

Passes:
- First and second stake requests succeed.
- Quote before second stake shows `current.userStake = 10` and `after.userStake = 25`.
- Quote after second submit shows `current.userStake = 25` (no stale quote state).
- Wallet balances changed correctly (`available -25`, `reserved +25`).
- Stakes and prediction-detail route APIs still load.

Fails:
- `singleAggregatedEntry`: FAIL  
  Two active rows were created (`10` and `15`) instead of one aggregated row.
- `aggregatedAmount25`: FAIL  
  Active position not represented as a single `25` row.
- `twoBetLocks` / `betLockSum25`: FAIL  
  No `wallet_transactions` `bet_lock` rows persisted for this flow.
- `optionPoolIncreased25`: FAIL  
  `prediction_options.total_staked` remained `0` after both stakes.

Root-cause notes from staging evidence:
- Top-up update path can fall back to creating a second entry row when schema compatibility issues occur.
- Wallet tx insert can fail on schema drift (`entry_id` column mismatch), currently treated as non-fatal.
- Option pool sync can fail when `prediction_options.updated_at` is unavailable in staging schema, leaving quote odds based on stale option pool.

### Staging Pass/Fail
- Overall A3 staging validation: **FAIL** (mutation-flow gap confirmed).

### Follow-up Fix Applied on Staging Branch (Code Delta)
- `server/src/routes/predictions/placeBet.ts`
  - Added schema-compatible fallback for top-up updates (retry without `updated_at`).
  - Added `insertWalletTransactionCompat` fallback (retry wallet tx insert without `entry_id` when missing-column drift exists).
  - Added option-pool/odds fallback sync after recompute to prevent stale `prediction_options.total_staked`.

### Remaining Blockers
1. Deploy staging branch with the above `placeBet.ts` fix.
2. Re-run the same staging checklist and confirm:
   - single aggregated row per user/market/outcome
   - two `bet_lock` rows with sum `25`
   - `prediction_options.total_staked` increments by `25`
3. Completed-route click-path is still unverified for this fresh participant because no completed positions exist; requires a settled fixture for that participant to close this check fully.
