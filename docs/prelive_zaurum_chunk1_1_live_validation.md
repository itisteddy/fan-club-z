# Pre-Live Zaurum Chunk 1.1 Live Validation

Date: 2026-03-13
Status: **Blocked at Phase 1 (live deploy parity not met)**

## Phase 1 — Live backend deploy parity

Live staging checks:
- `GET https://fanclubz-backend-staging.onrender.com/health`
  - `gitSha`: `45c14247ff3311dbc892165bf8fd7ed513961f75`
- `GET https://fanclubz-backend-staging.onrender.com/debug/config`
  - `gitSha`: `45c14247ff3311dbc892165bf8fd7ed513961f75`

Conclusion:
- Live staging backend is running `45c14247`.
- Chunk 1 bucket-aware backend changes (uncommitted local working-tree changes) are **not** in the live deployment.
- Per chunk instructions, validation stops here until staging backend is redeployed with chunk-1 code.

## Why this blocks Phase 2/3

Claim-cap and read-model verification must be tested against the deployed codepath.
Running claim-cap assertions now would validate old behavior, not chunk-1 behavior.

## Next required action

1. Commit and push chunk-1 backend changes to `staging`.
2. Wait for Render staging backend deploy.
3. Re-check `/health` + `/debug/config` SHA.
4. Resume Phase 2:
   - below-cap claim success path
   - at-cap `409 claim_cap_reached` path
5. Resume Phase 3 read-model journey verification.
