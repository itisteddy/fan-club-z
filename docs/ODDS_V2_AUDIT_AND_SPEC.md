# Odds V2 — Current State Report & Spec Lock

**Date:** 2026-01-31  
**Scope:** Audit only. No implementation in this document.

---

## A) Current State Report

### 1. Where odds are computed

| Location | What it does |
|----------|----------------|
| **Server** `server/src/routes/predictions.ts` (lines ~1461–1476) | After a prediction entry is created (POST `/:id/entries`), server **recalculates** `pool_total` from option `total_staked`, then for each option: `newOdds = stake > 0 && poolTotal > 0 ? Math.max(1.01, poolTotal / stake) : baseline` (baseline = number of options, e.g. 2). **Stored** in `prediction_options.current_odds`. |
| **Server** `server/src/routes/predictions.ts` (lines 956, 1939) | New options get default `current_odds: Number(option.currentOdds) \|\| 2.0`. |
| **Client** `client/src/pages/PredictionDetailsPageV2.tsx` (lines 753–760) | **Display fallback:** `selectedOptionOdds = current_odds ?? (poolTotal > 0 && optStaked > 0 ? poolTotal / optStaked : 2)`. So UI uses stored `current_odds` first, else derives `poolTotal / total_staked`, else **2**. |
| **Client** `client/src/components/predictions/PlacePredictionModal.tsx` (lines 146, 463–466) | Same idea: `current_odds \|\| (total_staked ? pool_total / total_staked : 2.0)`. |
| **Client** `client/src/components/prediction/PredictionDetailsContent.tsx` (line 406) | Renders `option.current_odds` as `{option.current_odds}x` or `'N/A'`. |

**Conclusion:** Odds are **server-authoritative** (computed and stored in DB after each bet). Client **displays** stored `current_odds` or recomputes `pool_total / total_staked` with **fallback 2.0** and **floor 1.01** on the server.

### 2. Current formula (server, after each bet)

- `poolTotal = sum(option.total_staked)` (recomputed from options).
- Per option: `newOdds = (stake > 0 && poolTotal > 0) ? Math.max(1.01, poolTotal / stake) : baseline` where `baseline = options.length` (e.g. 2 for binary).
- So: **odds = pool_total / option_total_staked**, **clamped to min 1.01**, and **default 2.0** (or N) when stake is 0.

**Where 1.01 and 2.00 come from:**  
- **1.01:** `Math.max(1.01, …)` in `server/src/routes/predictions.ts` line 1468.  
- **2.00:** Default when creating options (`current_odds: 2.0`) and client fallback when `poolTotal` or `optStaked` is 0.

### 3. Source of truth for pools

- **Stored:** `predictions.pool_total` (recomputed on each bet from options).  
- **Per option:** `prediction_options.total_staked` (updated when entry is created; see `server/src/routes/predictions.ts` ~1405–1423).  
- **Type:** DB uses `DECIMAL(18,8)` in disabled setup scripts; live code uses **dollars (float)** everywhere (e.g. `amountUSD`, `pool_total`, `total_staked`). No integer cents in current pool/odds path.

### 4. Current fee model

- **Fields:** `predictions.platform_fee_percentage`, `predictions.creator_fee_percentage` (e.g. 2.5 and 1.0 at create in `server/src/routes/predictions.ts` 928–929). **Percent, not bps.**  
- **Settlement (admin):** `server/src/routes/admin/predictions.ts` (538–540): fees taken from **losing** stake only.  
  - `cryptoPlatformFee = (totalCryptoLosingStake * platformFeePercent) / 100`  
  - `cryptoCreatorFee = (totalCryptoLosingStake * creatorFeePercent) / 100`  
  - `cryptoPrizePool = totalCryptoLosingStake - cryptoPlatformFee - cryptoCreatorFee`  
  - Winner payout = stake + share of prize pool (proportional to stake).  
- **Settlement (settlement.ts):** `server/src/routes/settlement.ts` (178–188): same idea — fees from losing pool, then `prizePoolUSD = totalLosingStake - platformFeeUSD - creatorFeeUSD`, `payoutPoolUSD = totalWinningStake + prizePoolUSD`.

So: **fees are already taken from the losing pool**; winners get stake + share of (losing pool − fees). Current bug is **odds display** (clamped 1.01 / default 2.0), not the settlement fee source.

### 5. Current API shapes (relevant to pools/odds)

- **GET /api/v2/predictions/:id**  
  Returns `data: { ...prediction, options, entriesCount, hasEntries, myStakeTotal?, ... }`.  
  Prediction includes `pool_total`. Each option includes `total_staked`, `current_odds` (from DB). No `totalPoolCents`, no `platform_fee_bps` (only percentage exists).

- **POST /api/predictions/:id/place-bet** (placeBet router)  
  Request: `{ optionId, amountUSD?, amountNgn?, fundingMode, walletAddress?, requestId? }`.  
  Response: `{ ok, entryId, data: { prediction, entry }, ... }`. Prediction in response includes updated `pool_total` and options (with `total_staked`, `current_odds`) when returned from entry-creation flow.

- **POST /api/v2/predictions/:id/entries** (legacy entry creation)  
  Updates option `total_staked`, recalculates `pool_total`, recomputes and stores `current_odds` per option, returns prediction with options.

### 6. Data model (existing)

- **predictions:** `pool_total`, `participant_count`, `platform_fee_percentage`, `creator_fee_percentage`, `stake_min`, `stake_max`. No `odds_model`, no bps fee columns.
- **prediction_options:** `total_staked`, `current_odds`. No `totalStakedCents`.

---

## B) Spec Lock for Odds V2

### Display strategy (option list)

- **Option A (recommended):** Show “Est. x.xx” using **reference stake = stakeLimits.min** (or min stake in cents). For **empty** options, compute as “first bettor” scenario (selectedPoolAfter = referenceStakeCents) so first bettor sees high multiple (e.g. >> 2.0).  
- **Option B:** Show “—” for empty pools and only show odds in the bet slip after user enters stake.  
- **Decision:** **Option A** — reference odds with `stakeLimits.minCents` (or 100 cents if min not set). Add “Est.” label and optional tooltip: “Estimate; payout changes as others stake.”

### Fee source

- **Fees taken from LOSING pool only** (already true in settlement). Odds V2 will use the same rule: `feesCents = floor(otherPoolCents * feeBpsTotal / 10_000)`, `distributableCents = selectedPoolCents + (otherPoolCents - feesCents)`.

### Data contract (V2)

**Inputs (required):**

- `selectedPoolCents` — total stake on selected option (integer cents).  
- `totalPoolCents` — total stake across all options (integer cents).  
- `platformFeeBps`, `creatorFeeBps` — basis points (integer).  
- `referenceStakeCents` — for option-list “reference” odds (e.g. min stake or 100).  
- `stakeCents` — for bet-slip preview (user’s entered stake).

**Outputs for UI:**

- **Reference (option list):** `referenceMultiple` (number, or null if cannot compute).  
- **Preview (bet slip):** `previewMultiple`, `expectedReturnCents`, `expectedProfitCents`, optional `feesCents`, `distributableCents`, `selectedPoolAfterCents`, `otherPoolAfterCents`.

**Rules:**

- If `selectedPoolCents === 0` and `stakeCents === 0` → return null/undefined for multiple.  
- If `selectedPoolCents === 0` and `stakeCents > 0` → treat as first bettor: `selectedPoolAfterCents = stakeCents`.  
- No clamp to 2.0 or floor to 1.01 in the new engine.

---

## C) Migration risk & odds_model

- **Live predictions:** Existing rows have no `odds_model`. Treat missing as **legacy**.  
- **Proposal:** Add `predictions.odds_model` (`'legacy' | 'pool_v2'`).  
  - **Default for new predictions:** `pool_v2` when `FLAG_ODDS_V2` is on; else `legacy`.  
  - **Existing rows:** Leave null or set to `legacy` (no change to settlement until explicitly migrated).  
- **Settlement:** If `odds_model === 'legacy'` → keep current settlement logic unchanged. If `odds_model === 'pool_v2'` → use new pool-based payout math (same fee-from-losing rule, single source in shared module).

---

## D) Files / functions reference (evidence)

| Purpose | File | Lines / identifier |
|--------|------|--------------------|
| Odds recompute after bet | `server/src/routes/predictions.ts` | 1462–1476 |
| Pool total recompute | `server/src/routes/predictions.ts` | 1425–1456 |
| Default odds on create | `server/src/routes/predictions.ts` | 956, 1939 |
| Default fee % on create | `server/src/routes/predictions.ts` | 928–929 |
| Settlement fees from losing | `server/src/routes/admin/predictions.ts` | 536–540 |
| Settlement fees (settlement.ts) | `server/src/routes/settlement.ts` | 178–188 |
| Client odds display (detail) | `client/src/pages/PredictionDetailsPageV2.tsx` | 751–760, 1179–1202 |
| Client odds (place modal) | `client/src/components/predictions/PlacePredictionModal.tsx` | 146, 463–466 |
| ODDS_V2 flag | `client/src/utils/environment.ts` | 36 (`VITE_FCZ_ODDS_V2`) |
| Prediction detail API | `server/src/routes/predictions.ts` | GET `/:id` 622–701 |

---

*End of audit. Implementation to follow in shared module + server/client integration.*

---

## TASKLOG (Odds V2)

- **Phase 0 (this doc):** Audit only. No code changes.
- **Current odds logic:** Server recomputes `current_odds = Math.max(1.01, pool_total / option.total_staked)` after each bet; default 2.0 for new/empty options. Client shows stored `current_odds` or `pool_total / total_staked` with fallback 2.0.
- **Current fee model:** `platform_fee_percentage` / `creator_fee_percentage` (e.g. 2.5% / 1.0%). Fees taken from **losing** pool at settlement (admin + settlement.ts). No bps columns today.
- **Spec lock:** Option list = reference odds with `stakeLimits.minCents`. Fee source = losing pool only. Data contract = cents-in/cents-out; outputs = referenceMultiple, previewMultiple, expectedReturnCents, expectedProfitCents.
- **Migration:** Add `odds_model` ('legacy' | 'pool_v2'); default new predictions to pool_v2 when FLAG_ODDS_V2 on; legacy predictions unchanged.

---

### Phase 2 — Odds engine (implemented)

- **Module:** `shared/src/oddsV2.ts` — pool-based, fee-from-losing-pool, integer cents, no clamp.
- **Exports:** `computeReferenceMultiple`, `computePreview`, `computePayoutMultiple`, `formatMultiple`.
- **Feature flag:** `VITE_FCZ_ODDS_V2` (client) / `ODDS_V2` in featureFlags; default off. Server can use env `FLAG_ODDS_V2` when integrating.
- **Tests:** `server/src/__tests__/oddsV2.test.ts` — 13 tests (reference multiple, preview, payout multiple, format). Run: build shared, then `npm --prefix server run test -- oddsV2`.
- **Reference case:** YesPool=37500c, NoPool=0, reference 100c on No → multiple ~362.88x (>> 2.0). No clamp.

---

### Phase 3 — Data model + API + UI wiring

- **Migration:** `server/migrations/324_prediction_odds_model.sql` adds `predictions.odds_model` (NULL | 'legacy' | 'pool_v2'). Run before enabling FLAG_ODDS_V2.
- **Create prediction:** `server/src/routes/predictions.ts` sets `odds_model: process.env.FLAG_ODDS_V2 === '1' ? 'pool_v2' : 'legacy'` on insert.
- **Enricher:** `server/src/utils/enrichPredictionOddsV2.ts` adds `totalPoolCents`, `platformFeeBps`, `creatorFeeBps`, `stakeMinCents`, `odds_model`, and per-option `totalStakedCents` and `referenceMultiple` (when odds_model === 'pool_v2') using shared `computeReferenceMultiple`. Used in GET /api/v2/predictions/:id and place-bet responses.
- **Client (PredictionDetailsPageV2):** When ODDS_V2 + odds_model === 'pool_v2', uses `computePreview` for payout preview (stake → expectedReturnCents, expectedProfitCents, multiple); option list uses `referenceMultiple` from API; "Est." label and disclosure "Estimate; payout changes as others stake" when pool_v2.
- **Client (OptionsSection):** Displays `referenceMultiple` when present (Est. X.XXx); fallback to current_odds / pool ratio; tooltip on Est. odds.
- **Client (PlacePredictionModal):** When ODDS_V2 + odds_model === 'pool_v2', uses `computePreview` for potential payout and `referenceMultiple` for option list; shows "Est. X.XXx" when reference odds present.
- **Settlement (pool_v2):** Not changed in this phase; legacy settlement remains. Pool_v2 settlement can use shared `computePayoutMultiple` in a follow-up.

### Pool-based payout preview (poolMath) — single source of truth

- **Module:** `shared/src/poolMath.ts` — pool-based (pari-mutuel) odds and payout preview. Same fee rule as settlement: **fees taken from the LOSING pool only** (`otherPool = T' - W'`, `fees = otherPool * feeBps/10000`, `distributable = T' - fees`, `multiplePost = distributable / W'`). Used everywhere for UI so preview never shows impossible payouts (e.g. stake × preOdds).
- **Exports:** `getPreOddsMultiple(totalPool, optionPool)`, `getPostOddsMultiple({ totalPool, optionPool, stake, feeBps })`, `getPayoutPreview({ ... })` → `{ expectedReturn, profit, multiplePre, multiplePost, distributablePool }`.
- **Fee rule used and why it matches settlement:** Settlement (`payoutCalculator.ts`, `settlementOddsV2.ts`) takes platform + creator fees from **losing stakes only**; winners receive stake + share of (losing pool − fees). `poolMath.getPayoutPreview` uses the same rule: fees applied to `otherPool = T' - W'`, so estimated net return matches what settlement will pay.
- **Tests:** `server/src/__tests__/poolMath.test.ts` — live bug example (T=450, Wi=75, stake=250, fee=0 → expectedReturn ≈ 538.46, NOT 1500); edge cases (optionPool=0, feeBps).
- **UI:** Option list shows **current odds** only (`multiplePre` = T/Wi). Stake preview shows **Estimated return**, **Potential profit**, **Estimated odds (with your stake)** (`multiplePost`), **Current odds**, helper text, and "Fees included: X%". Total Volume = same totalPool used in math (sum of option pools or prediction.pool_total).
