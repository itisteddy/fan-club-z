# Fan Club Z Architecture

This document describes the core architecture and domain rules for Fan Club Z.

## Prediction Lifecycle and Payout Invariants

### Prediction Status Lifecycle

Predictions progress through the following statuses:

- **pending**: Draft/not yet open for entries
- **open**: Accepting entries
- **closed**: Entry deadline passed, awaiting settlement
- **awaiting_settlement**: Closed and ready for settlement
- **settled**: Settlement completed, payouts distributed
- **disputed**: Under dispute resolution
- **cancelled**: Cancelled before settlement
- **refunded**: Cancelled and refunds issued
- **ended**: Legacy/alternate for closed/settled

#### Allowed Status Transitions

- `pending` → `open`, `cancelled`
- `open` → `closed`, `cancelled`
- `closed` → `awaiting_settlement`, `settled`, `disputed`, `cancelled`
- `awaiting_settlement` → `settled`, `disputed`, `cancelled`
- `settled` → (terminal)
- `disputed` → `settled`, `cancelled`, `refunded`
- `cancelled` → `refunded`
- `refunded` → (terminal)
- `ended` → (terminal)

See `server/src/domain/predictionStatus.ts` for the canonical implementation.

### Payout Rules Summary

#### Pot Calculation
- **pot_total = sum(entries.stake)**
  - The total pot equals the sum of all entry stakes
  - Computed per rail: demo pot = sum of demo entries, crypto pot = sum of crypto entries

#### Fee Application
- Fees apply **per rail** (demo vs crypto)
  - Demo pot fees computed from demo entries only
  - Crypto pot fees computed from crypto entries only
- Fees are applied to **losing stakes only** (not winning stakes)
  - `platform_fee = (total_losing_stakes * platform_fee_percentage) / 100`
  - `creator_fee = (total_losing_stakes * creator_fee_percentage) / 100`
- Winning stakes are returned in full (no fees deducted)

#### Payout Distribution
- **total_distributed_to_winners <= pot_total - fees**
- Winners receive: their stake back + proportional share of (losing stakes - fees)
- `payout_pool = winning_stakes + (losing_stakes - platform_fee - creator_fee)`
- Each winner's payout = `(winner_stake / total_winning_stakes) * payout_pool`

#### Hybrid Rail Behavior

**Demo Rail (Off-Chain)**
- Demo payouts update the demo wallet balance in the database
- No on-chain transaction is created for demo payouts
- Demo fees are credited to creator/platform off-chain wallets
- Provider: `demo-wallet`
- Currency: `DEMO_USD`

**Crypto Rail (On-Chain)**
- Crypto payouts are recorded as claimable amounts in the escrow contract
- Users must call `claim()` on-chain to receive crypto payouts
- Crypto payouts do NOT credit the off-chain wallet balance
- Crypto fees are sent on-chain to creator/platform addresses
- Provider: `crypto-base-usdc`
- Currency: `USD`

See `server/src/domain/payoutRules.ts` for the canonical implementation and validation helpers.
