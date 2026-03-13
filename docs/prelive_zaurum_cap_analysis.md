# Pre-Live Zaurum Migration Cap Analysis

Date: 2026-03-13
Status: Updated recommendation after higher-tail production-like analysis + SQL verification

## Method

Conversion tested:
- `converted_zaurum_uncapped = legacy_demo_credits / 10`

Cap scenarios tested:
- 250
- 500
- 750
- 1000

Read-only SQL used:
- [prelive_zaurum_cap_analysis.sql](/Users/efe/Dev/fanclubz/docs/sql/prelive_zaurum_cap_analysis.sql)

## Cap-impact SQL verification (full-population check)

Verified:
- `cap_impact` is computed from `converted` with `CROSS JOIN caps` and `GROUP BY cap`.
- `total_capped_zaurum = SUM(LEAST(converted_zaurum_uncapped, cap))` over **all users** in `converted` for each cap.
- `total_trimmed_zaurum = SUM(converted_zaurum_uncapped - LEAST(converted_zaurum_uncapped, cap))` over **all users**.
- Query now includes `total_users` per cap row to make full-population scope explicit.

Conclusion:
- Current cap-impact logic is correct for full-population totals and is not limited to capped users only.

## Staging Sample Results (110 users with DEMO_USD rows)

### Distribution
- max demo credits: `10075`
- p50 demo credits: `25`
- p90 demo credits: `201.578`
- p95 demo credits: `557.4295`
- p99 demo credits: `2344.6223`

Converted (10:1):
- max converted (uncapped): `1007.5`
- p50 converted: `2.5`
- p90 converted: `20.1578`
- p95 converted: `55.74295`
- p99 converted: `234.46223`

### Balance bands (converted view)
- `0`: 35 users
- `1-9.9 Z`: 58 users
- `10-99.9 Z`: 15 users
- `100-499.9 Z`: 1 user
- `1000+ Z`: 1 user

### Cap impact (staging sample)
- cap 250:
  - users capped: 1 (`0.91%`)
  - trimmed: `757.5` Z
- cap 500:
  - users capped: 1 (`0.91%`)
  - trimmed: `507.5` Z
- cap 750:
  - users capped: 1 (`0.91%`)
  - trimmed: `257.5` Z
- cap 1000:
  - users capped: 1 (`0.91%`)
  - trimmed: `7.5` Z

## Updated Recommendation

Recommended migration cap: **250 Zaurum** (with 10:1 conversion)

Why:
- Aligns with latest higher-tail production-like analysis and conservative pre-live economy goals.
- Limits outsized legacy carry-over while preserving broad-user migration continuity.
- Preserves strict differentiation between participation subsidy and future earn/withdraw pathways.

## Important Limitation

This analysis was run on staging data, not full production history.
Latest direction is to proceed with 250; production read-only output should still be archived for audit before execution.

## Production Data Needed to Finalize

Run the same SQL (read-only) on production DB and return:
1. user_count with `DEMO_USD`
2. max, p50, p90, p95, p99 (demo credits and converted values)
3. cap impact rows for 250/500/750/1000
4. balance-band counts

If production distribution differs materially from expected high-tail profile, document but keep policy-driven cap unless product direction changes.
