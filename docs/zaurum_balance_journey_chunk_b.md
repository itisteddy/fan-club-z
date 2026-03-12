# Zaurum Trust Repair — Chunk B (Balance/Journey Alignment)

Date: 2026-03-12  
Branch: `staging`

## Root Cause Summary
The trust gap was caused by mixed frontend balance sources and inconsistent cache invalidation:
1. Stake-entry screens used mixed fallbacks (`walletSummary` + legacy `demo-wallet/summary` local state), while wallet cards were primarily driven by `walletSummary`.
2. Faucet and post-stake flows updated some local state paths but did not consistently invalidate/refetch the wallet-summary source consumed across screens.
3. Claim-related hooks used query keys that did not align with global claim invalidation prefixes, increasing stale claim/availability risk.

## Canonical Visible Source Chosen (Zaurum mode)
- **Available-to-stake**: `walletSummary.stakeBalance` (fallback: `walletSummary.balances.stakeBalance`, then `walletSummary.available`, then `0`)
- **Locked**: `walletSummary.reserved` (fallback: `walletSummary.reservedUSDC`, then `0`)
- **Creator earnings**: `walletSummary.creatorEarnings` (fallback: `walletSummary.balances.creatorEarnings`, then `0`)

Why this source:
- It matches existing A2/A3/A4 creator-transfer semantics where transfer increases `stakeBalance`.
- It lets wallet and stake-entry surfaces show the same visible available value without divergent fallback chains.

## What Changed
- Removed legacy demo-summary fallback path from:
  - `PredictionDetailsPageV2`
  - `PlacePredictionModal`
- Added consistent wallet-summary invalidation/refetch after:
  - faucet claim
  - stake placement refresh path
  - creator-earnings transfer
- Aligned claim hook query keys with global invalidation prefixes:
  - `useClaimableClaims` -> `['claimable-claims', ...]`
  - `useMerkleProof` -> `['merkle-proof', ...]`

## Consistency Table (staging API run)
Source: `/tmp/chunkb_staging_validation.json`

| step | wallet available | stake-entry available | locked | creator earnings | expected | match/mismatch |
|---|---:|---:|---:|---:|---|---|
| start | 20 | 20 | 3 | 12 | initial seeded values visible | MATCH |
| after_faucet | 20 | 20 | 3 | 12 | available should increase or cooldown structured response should be returned | MATCH |
| after_creator_transfer | 27 | 27 | 3 | 5 | creator decreases by 7 and available increases by 7 | MATCH |
| after_bet1 | 27 | 27 | 13 | 5 | available down by 10, locked up by 10 | MATCH |
| after_bet2 | 27 | 27 | 28 | 5 | available down by 15 more, locked up by 15 more | MATCH |

## Regression Flow Results
Source: `/tmp/a4_staging_validation.json`

- walletSummaryLoads: PASS
- walletSummaryHasContextValues: PASS
- creatorTransferWorks: PASS
- stakeFlowBet1: PASS
- stakeFlowBet2: PASS
- stakeFlowQuoteCurrentAfterSubmit: PASS
- stakeFlowNoDuplicateRows: PASS
- discoverRouteApiLoads: PASS
- stakesRouteApiLoads: PASS
- completedRouteApiLoads: PASS

## Remaining Deferred Backend-Semantics Issue
Potential backend semantics follow-up (deferred):
- `/api/wallet/summary` exposes both `available` and `stakeBalance` with different behaviors after creator-transfer/stake-lock flows.
- Current Chunk B keeps frontend consistent by selecting one canonical visible source (`stakeBalance`) rather than changing backend accounting/read contracts.
- If product requires “Available” to represent net spendable after locks, backend/read-model contract clarification is needed in a future backend-safe chunk.
