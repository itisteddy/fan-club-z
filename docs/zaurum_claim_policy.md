# Zaurum Daily Claim Policy

## Overview
The daily claim system for Zaurum (formerly Demo Credits) uses a deterministic halving schedule to manage token inflation while encouraging daily engagement.

## Policy Details
- **Starting Amount**: 50 ZAU per day
- **Start Date**: 2026-03-15
- **Timezone**: America/New_York (all calendar days are evaluated against EST/EDT)
- **Floor Amount**: 1 ZAU per day
- **Target Floor Date**: On or before 2026-06-30

## Formula
The system uses a mathematical progression over intervals to reduce the daily claim amount:
- **Base Amount**: 50
- **Halving Interval**: ~17 days (calculated to reach 1 before 2026-06-30 from 2026-03-15)

`days_since_start = (current_date - start_date).days`
`halving_step = 1 + floor(days_since_start / step_interval_days)`
`amount = max(1, round(base_amount / (2 ^ halving_step)))`

## Database Implementation
Rather than calculating the halving dynamically on every claim request, the schedule is pre-computed and stored deterministically in the `daily_claim_policy` table.

```sql
CREATE TABLE IF NOT EXISTS public.daily_claim_policy (
  effective_date DATE PRIMARY KEY,
  amount NUMERIC NOT NULL CHECK (amount >= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Claim Logic
1. Server determines "today's date" in `America/New_York`.
2. Selects the row from `daily_claim_policy` where `effective_date <= today`, ordered by `effective_date DESC`.
3. If the environment variable `FCZ_ENABLE_DAILY_CLAIM=false`, the endpoint immediately rejects the claim.
4. Enforces the standard 24-hour cooldown per user.
5. Emits a `DAILY_CLAIM` ledger transaction via the `WalletService`.

## Expected Schedule Milestones
- `2026-03-15` -> 25 ZAU
- `2026-04-01` -> 13 ZAU (approx)
- `2026-04-18` -> 6 ZAU (approx)
- `2026-05-05` -> 3 ZAU (approx)
- `2026-05-22` -> 2 ZAU (approx)
- `2026-06-08` -> 1 ZAU
- `2026-06-30` -> 1 ZAU (Floor reached)
