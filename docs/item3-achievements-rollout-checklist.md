# Item 3 (Achievements) Validation Checklist

## Staging

1. Create two users and generate fixture activity:
   - stakes for both users
   - at least one payout for one user
   - creator earnings credit for one user
   - comments for one user
2. Run achievements recompute manually:
   - `POST /api/v2/admin/achievements/recompute` (admin only)
3. Verify `user_stats_daily` rows:
   - daily stake counts/amounts
   - payouts amount
   - creator earnings amount
   - comments count
   - `net_profit = payouts_amount - stake_amount`
4. Verify `user_awards_current`:
   - rows exist for `7d`, `30d`, `all`
   - ranks sorted correctly for fixture users
5. Verify `user_badges`:
   - `FIRST_STAKE`, `FIRST_COMMENT`, `FIRST_CREATOR_EARNING`
   - `TEN_STAKES` only when threshold met
6. Open profile page (`/profile` and `/profile/:userId`):
   - Achievements section visible
   - Awards and Badges clearly separated
   - descriptions render and detail modal opens
7. Profile load performance sanity:
   - one achievements request only
   - no heavy ranking queries on profile request path

## Production Rollout

1. Apply migration `migrations/115_achievements_badges_awards.sql`
2. Deploy backend + web
3. Run one manual recompute job (`/api/v2/admin/achievements/recompute`)
4. Spot-check 2–3 profiles for achievements rendering
5. Monitor server logs for:
   - achievements recompute errors
   - achievements endpoint errors
6. If issues occur:
   - rollback app deploys (DB migration is additive and can remain)
   - rerun recompute after hotfix deploy
