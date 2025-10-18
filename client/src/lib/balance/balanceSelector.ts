import type { WalletState } from '../../store/walletStore';

/**
 * Returns the amount of escrow USDC available to stake (escrow - reserved).
 * This is the "Available to stake" number shown in the UI.
 */
export function selectEscrowAvailableUSD(state: WalletState): number {
  const escrow = Number(state.onchain?.escrowUSDC ?? 0);        // whole USDC
  const reserved = Number(state.onchain?.escrowReservedUSDC ?? 0);
  return Math.max(escrow - reserved, 0);
}

/**
 * Returns overview balances for the wallet page:
 * - walletUSDC: ERC20 USDC in wallet
 * - escrowUSDC: Total USDC deposited in escrow
 * - escrowAvailableUSDC: Escrow - reserved (what user can actually stake/withdraw)
 */
export function selectOverviewBalances(state: WalletState) {
  const walletUSDC = Number(state.onchain?.walletUSDC ?? 0);
  const escrowUSDC = Number(state.onchain?.escrowUSDC ?? 0);
  const reservedUSDC = Number(state.onchain?.escrowReservedUSDC ?? 0);

  return {
    walletUSDC,
    escrowUSDC,
    escrowAvailableUSDC: Math.max(escrowUSDC - reservedUSDC, 0),
  };
}

