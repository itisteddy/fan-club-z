# Pre-Live Zaurum Economy — Chunk 3 Compatibility Cleanup

Date: 2026-03-13
Status: In progress (build + staging validation pending)

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

To be filled after live validation run.
