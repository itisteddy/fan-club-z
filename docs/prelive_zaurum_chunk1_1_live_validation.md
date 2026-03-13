# Pre-Live Zaurum Chunk 1.1 Live Validation

Date: 2026-03-13
Status: **Chunk 1 LIVE-VALIDATED (staging)**

## Phase 1 — Live backend deploy parity

Live staging checks after deploy:
- `GET https://fanclubz-backend-staging.onrender.com/health`
  - `gitSha`: `f49137eacc895a8b9a59224c2fd517cb59e1b000`
- `GET https://fanclubz-backend-staging.onrender.com/debug/config`
  - `gitSha`: `f49137eacc895a8b9a59224c2fd517cb59e1b000`

Deployed chunk-1 backend commit:
- `f49137eacc895a8b9a59224c2fd517cb59e1b000`

Conclusion:
- Live staging backend is no longer stale and is serving chunk-1 bucket-aware code.

## Phase 2 — Live claim-cap validation

### Below-cap user (< 30 claim bucket)
- Request:
  - `POST /api/demo-wallet/faucet`
  - body: `{"userId":"14acd61e-369a-4f6d-aeb2-49503ee0f993"}`
- Response:
  - HTTP `200`
  - `x-request-id`: `8f8f11bd-1fc6-48a8-8637-62b0da7aa1a8`
  - body includes `success: true`
- Verification:
  - faucet credit applied as 1 unit
  - wallet transaction written with `source_bucket=claim_zaurum`
  - `claim_zaurum_balance` incremented by 1

### At-cap user (>= 30 claim bucket)
- Request:
  - `POST /api/demo-wallet/faucet`
  - body: `{"userId":"04af1fed-2ee0-4f9b-a1e3-862999f4c1c7"}`
- Response:
  - HTTP `409`
  - `x-request-id`: `2b72c7ed-112d-4693-a4eb-daa64c7c142a`
  - body:
    - `error: "claim_cap_reached"`
    - `message: "Claim bucket cap reached"`
    - `claimCap: 30`
    - `claimBalance: 30`
- Verification:
  - no faucet credit row created for blocked request
  - balances unchanged for blocked attempt

## Phase 3 — Live read-model consistency

Flow run artifact:
- `/tmp/chunk1_1_flow2_result.json`

Validated journey (staging users + fresh market):
1. claim
2. first stake
3. top-up stake
4. close
5. settlement call (`/api/v2/settlement/manual`)

Observed:
- Wallet summary remained coherent through claim and stake transitions.
- Bucket fields changed consistently with wallet totals:
  - claim path credited claim bucket.
  - stake lock debited available + claim bucket proportionally where expected.
- Settlement endpoint returned `200` with `alreadySettled: true` for this run's prediction context.
- Creator transfer step was skipped in this specific run due to zero creator earnings returned for that context.

Result:
- No visible read-model corruption observed in the tested claim/stake path.
- Additional creator-transfer-on-positive-earnings pass remains a recommended follow-up sanity check, not a chunk-1 blocker.

## Phase 4 — Compatibility field review (`demo_credits_balance`)

Why it is still updated:
- It is intentionally mirrored as a compatibility shadow during migration so legacy readers do not break while bucket fields are introduced.

Current status:
- Active wallet summary reads remain coherent against deployed chunk-1 behavior.
- Bucket-aware balances are now persisted and queryable.
- `demo_credits_balance` still exists as a transitional compatibility field.

Risk assessment:
- No confirmed double-counting in live validation results for chunk-1 flow.
- Residual risk is mainly technical debt: old/inactive readers could still consume legacy fields directly.

Recommended small follow-up (deferred):
- Inventory and retire remaining active reads that directly depend on legacy-only `demo_credits_balance`, then reduce/remove shadow mirroring in a controlled phase.

## Final status for Chunk 1.1

- **Chunk 1 LIVE-VALIDATED on staging** for deploy parity + claim-cap enforcement + read-model coherence checks run.
- **App remains NOT READY FOR PROD** in this task context (promotion intentionally out of scope for this chunk).
