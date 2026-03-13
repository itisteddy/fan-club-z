# Prediction Settlement Path Diff: `/manual` vs `/manual/merkle`

Date: 2026-03-12  
Branch: `staging`

## 1) Request payload contract

- `POST /api/v2/settlement/manual`
  - Expects: `predictionId`, `winningOptionId`, `userId`
  - Optional: `proofUrl`, `reason`
- `POST /api/v2/settlement/manual/merkle`
  - Expects: `predictionId`, `winningOptionId`, `userId`
  - Optional: `reason`

Both paths require the same identity tuple for prediction resolution.

## 2) Auth/role checks

- Both routes verify creator ownership:
  - Load prediction by `predictionId`
  - Compare `prediction.creator_id` with `userId`
  - Return `403` if mismatch

## 3) Prediction lookup logic (critical divergence)

- `/manual` lookup:
  - `select('*')` from `predictions` by id
  - If missing row -> `404 Prediction not found`
- `/manual/merkle` (before fix):
  - `select('id, creator_id, title, status, settled_at, winning_option_id, resolution_reason, resolution_source_url, platform_fee_percentage, creator_fee_percentage')`
  - Any select error (including missing-column schema drift) was collapsed into `404 Prediction not found`

### Why this caused false 404/500

For the same valid prediction:
- `/manual` could resolve because `select('*')` is tolerant to optional-column drift
- `/manual/merkle` could fail at query time if explicitly selected columns were absent in staging schema (confirmed with `winning_option_id` drift)
- Handler previously returned `404 Prediction not found`, masking query failure as missing entity
- First fix changed this to `500 database_error`; follow-up narrowed fallback select so route can proceed on older schema

## 4) Settlement behavior differences (intended)

- `/manual`
  - Off-chain settlement flow
  - Idempotent settled response contract
- `/manual/merkle`
  - Hybrid path:
    - settle demo rail
    - if crypto entries exist and server crypto enabled, compute/persist merkle proof + pending on-chain path
    - idempotent settled response contract

These behavior differences are expected and not the parity bug root cause.

## 5) Root cause classification

- Category: **A**
  - `/manual/merkle` used different prediction lookup semantics and error mapping, producing false `Prediction not found` for valid predictions.

## 6) Minimal fix applied

- Added schema-tolerant prediction loader for `/manual/merkle`:
  - try primary select (includes `resolution_*`)
  - if primary fails due to column-select error (`42703`/`PGRST204`/column-missing message), retry with minimal fallback select (`id, creator_id, title, status, platform_fee_percentage, creator_fee_percentage`)
- Error mapping corrected:
  - true query failure -> `500 database_error`
  - only missing row -> `404 Prediction not found`

This preserves route contract and behavior while removing the false-404 divergence.

## 7) Validation snapshot

On staging backend `10eef59a...` with same authenticated user + prediction:
- `POST /api/v2/settlement/manual` -> `200`
- `POST /api/v2/settlement/manual/merkle` -> `200`

No `Prediction not found` mismatch remains between the two paths for the tested flow.
