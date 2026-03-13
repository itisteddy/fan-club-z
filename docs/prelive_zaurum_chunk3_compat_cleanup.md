# Pre-Live Zaurum Economy — Chunk 3 Compatibility Cleanup

Date: 2026-03-13
Status: Staging-validated

## Active compatibility risk inventory

1) `client/src/pages/UnifiedWalletPage.tsx`
- Finding: retained fetch to `/api/demo-wallet/summary` in non-primary branch.
- Classification: active and must clean now.
- Action: removed active dependency; wallet cards now read canonical `/api/wallet/summary` values.

2) `client/src/pages/PredictionDetailsPageV2.tsx`
- Finding: available-to-stake fallback prioritized `stakeBalance` over canonical `available`.
- Classification: active and must clean now.
- Action: prioritize `walletSummary.available`.

3) `client/src/components/predictions/PlacePredictionModal.tsx`
- Finding: same fallback order issue as prediction detail.
- Classification: active and must clean now.
- Action: prioritize `walletSummary.available`.

4) `server/src/routes/walletSummary.ts`
- Finding: `demoCredits` compatibility alias could diverge if derived from legacy path.
- Classification: compatibility alias, medium risk.
- Action: hard-mirror alias to visible `available`.

5) `server/src/routes/walletRead.ts`
- Finding: same alias drift risk for alternate summary route.
- Classification: compatibility alias, low-medium risk.
- Action: hard-mirror alias to visible `available`.

6) `client/src/pages/WalletPageV2.tsx`
- Finding: heavy legacy semantics remain.
- Classification: inactive/legacy (not primary `/wallet` route).
- Action: defer in this chunk; no change.

7) `/api/demo-wallet/summary`
- Finding: legacy summary endpoint still exists.
- Classification: compatibility endpoint; low risk after active UI dependency removal.
- Action: kept for now; no active wallet page dependency after this chunk.

## Validation checklist

- Build:
  - `npm --prefix server run build`
  - `npm --prefix client run build`
- Controlled staging validation cohorts:
  - migrated user
  - below-cap claimant
  - at-cap claimant
  - stake/top-up users
  - creator transfer user

## Results

### Build
- `npm --prefix server run build`: pass
- `npm --prefix client run build`: pass

### Live deploy parity
- Staging backend `/health` gitSha: `b9e80a64856d06b1b8df3874e2123e68badebb16`
- Validation artifact: `/tmp/prelive_chunk3_live_validation.json`

### Controlled staging validation (required cohorts)

1) Migrated user
- Migration dry-run/apply/reapply remained deterministic + idempotent.
- Visible summary: available moved `0 -> 100`, `legacyMigratedZaurum=100`.

2) Below-cap claimant
- Faucet request returned `200` (`x-request-id: b88673d8-7897-48bd-9161-4d0fe8fee0b1`).
- Visible summary coherent: available `0 -> 1`, claim bucket `0 -> 1`.

3) At-cap claimant
- Faucet request returned `409 claim_cap_reached` (`x-request-id: 09760a45-d578-4914-8da5-2bbafc378fcc`).
- No visible credit drift.

4) Stake/top-up user path
- Bets placed (`200/200/200` status codes).
- Post-stake visibility coherent:
  - participant A: available `1 -> 0.5`, reserved `0 -> 0.5`
  - participant B: available `1 -> 0.4`, reserved `0 -> 0.6`

5) Creator transfer user
- Transfer endpoint `POST /api/wallet/transfer-creator-earnings` returned `200`.
- Creator earnings visible value moved `2 -> 1` after transfer.

### Active compatibility dependency status after chunk 3

Cleaned on active paths:
- Removed active `/api/demo-wallet/summary` call from `UnifiedWalletPage`.
- Active wallet + stake surfaces now prioritize canonical `available` for visible spendable balance.
- Server compatibility alias `demoCredits` now mirrors visible `available`.

Remaining compatibility/debt (not release-blocking in this chunk):
- `demoCredits` alias still present in summary payload for backward compatibility.
- `WalletPageV2` still contains legacy semantics, but is not the active `/wallet` route.
- `/api/demo-wallet/summary` endpoint remains available for compatibility; no active wallet screen depends on it.
