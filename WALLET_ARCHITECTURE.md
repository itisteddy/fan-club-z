# Wallet Architecture - Clear Separation

## Core Principle
**On-chain data = Source of truth. Database = Transaction history only.**

## Data Sources

### 1. Crypto Wallet Balance (On-Chain ERC20)
**Source:** `useUSDCBalance()` hook
**Reads:** USDC ERC20 contract `balanceOf(userAddress)` on Base Sepolia
**What it represents:** USDC tokens in user's connected crypto wallet (MetaMask, Coinbase Wallet, etc.)
**Use case:** "Wallet USDC" card - shows how much USDC user has in their wallet

### 2. Escrow Contract Balance (On-Chain)
**Source:** `useEscrowBalance()` hook
**Reads:** Escrow contract `balances(userAddress)` and `reserved(userAddress)` on Base Sepolia
**What it represents:** 
- `availableUSD`: USDC deposited into escrow contract that's available to stake
- `reservedUSD`: USDC locked for active predictions (pending bets)
- `totalUSD`: Total USDC in escrow (available + reserved)
**Use cases:**
- "In Escrow" = `totalUSD` (all funds in escrow)
- "Available" = `availableUSD` (funds available for new bets)
- "Reserved" = `reservedUSD` (funds locked for active bets)

### 3. Transaction History (Database)
**Source:** `useWalletActivity()` hook
**Reads:** `wallet_transactions` table (filtered by `provider = 'crypto-base-usdc'`)
**What it represents:** Historical record of deposits, withdrawals, locks, bets
**Use case:** Activity feed - shows past transactions

### 4. Escrow Locks (Database - Optional/Redundant)
**Source:** `useWalletSummary()` hook (currently returns escrow locks from database)
**Problem:** This is redundant - escrow balance should come from on-chain
**Future:** Remove this or use it only for metadata, not balance calculation

## UI Display Rules

### Wallet Page Cards:
1. **"Wallet USDC"** 
   - Source: `useUSDCBalance().balance`
   - Label: "Base Sepolia"
   - Shows: ERC20 USDC balance in user's wallet

2. **"In Escrow"**
   - Source: `useEscrowBalance().totalUSD` (availableUSD + reservedUSD)
   - Label: "locked"
   - Shows: Total USDC deposited into escrow contract

3. **"Available"**
   - Source: `useEscrowBalance().availableUSD`
   - Label: "ready to stake"
   - Shows: USDC in escrow available for new bets (excludes reserved)

### Prediction Page "Available to Stake":
- Source: `useEscrowBalance().availableUSD` (on-chain)
- Fallback: None - must be on-chain
- Shows: How much user can stake on current prediction

### Activity Feed:
- Source: `useWalletActivity()` (database)
- Shows: Historical transactions (deposits, withdrawals, bets)

## Data Flow

```
User Wallet (MetaMask/Coinbase)
  ↓ (deposit via DepositUSDCModal)
Escrow Contract (Base Sepolia)
  ↓ (useEscrowBalance reads)
UI Display

Transaction Recorded:
  ↓ (DepositUSDCModal on success)
Database (wallet_transactions)
  ↓ (useWalletActivity reads)
Activity Feed
```

## What NOT to Use

❌ **NEVER use:**
- `wallets.available_balance` from database (old demo/mock data)
- `wallets.reserved_balance` from database (old demo/mock data)
- `walletSummary.walletUSDC` from database (doesn't exist - removed)
- Any calculation from database for current balances

✅ **ALWAYS use:**
- `useUSDCBalance()` for wallet balance
- `useEscrowBalance()` for escrow balances
- `useWalletActivity()` for transaction history

