import { useCallback } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';

export function useSwitchToBase() {
  const { chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();

  const ensureBase = useCallback(async () => {
    if (chainId === baseSepolia.id) return { ok: true as const };
    try {
      await switchChainAsync({ chainId: baseSepolia.id });
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: e };
    }
  }, [chainId, switchChainAsync]);

  return { ensureBase, isSwitching: isPending, isOnBase: chainId === baseSepolia.id };
}

