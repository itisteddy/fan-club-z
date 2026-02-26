# Item 2 Rollout Validation Checklist (Multi-Stake Top-Ups)

## Staging

1. Place first stake on an open market/outcome and confirm position is created.
2. Place a second stake on the same market/outcome and confirm the same position increases (no duplicate row in My Bets).
3. In stake modal, confirm quote preview updates as amount changes and shows:
   - current position
   - after this stake
   - odds/price + estimated payout
4. Simulate pool change between preview and submit (another account stakes) and confirm submit response `quoteUsed` reflects final server quote.
5. Verify demo mode debits demo credits only; real mode debits stake/escrow path only.
6. Verify `position_stake_events` rows exist for each top-up with `quote_snapshot`.
7. Verify wallet ledger/debit rows still exist for each stake.
8. Verify market close rules still prevent stake and quote after deadline/close.
9. Verify settlement uses aggregated `prediction_entries.amount` totals correctly.

## Production

1. Monitor logs for:
   - `GET /api/v2/predictions/:id/quote`
   - `POST /api/v2/predictions/:id/entries`
   - `POST /api/predictions/:predictionId/place-bet`
2. Monitor for elevated 409s (`conflicting_position`, `duplicate_entry`) and 400s (`prediction_closed`, `invalid_amount`).
3. Spot-check one demo and one real top-up flow.
4. Confirm no regression in first-time single stake flow.

