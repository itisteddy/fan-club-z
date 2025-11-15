import type { WalletState } from '../../store/walletStore';

export function selectEscrowAvailableUSD(state: WalletState): number {
  const available = Number(state.walletSummary?.available_balance ?? 0);
  return Math.max(available, 0);
}

export function selectOverviewBalances(state: WalletState) {
  const availableBalance = Number(state.walletSummary?.available_balance ?? 0);
  const reservedBalance = Number(state.walletSummary?.reserved_balance ?? 0);
  const totalBalance = Number(state.walletSummary?.total_balance ?? 0);

  return {
    walletUSDC: totalBalance,
    escrowUSDC: totalBalance,
    escrowAvailableUSDC: Math.max(availableBalance, 0),
  };
}
