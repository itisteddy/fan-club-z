import { baseSepolia } from 'wagmi/chains';
import { useAccount, usePublicClient, useSwitchChain } from 'wagmi';
import { waitForTransactionReceipt } from 'viem/actions';

export function usdToUsdcUnits(amount: number): bigint {
  // 2.50 -> 2500000 (6 decimals)
  return BigInt(Math.round(amount * 1_000_000));
}

export function useBaseTxUtils() {
  const { chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: baseSepolia.id });
  const { switchChainAsync } = useSwitchChain();

  async function ensureBase() {
    if (chainId !== baseSepolia.id) {
      await switchChainAsync({ chainId: baseSepolia.id });
    }
  }

  async function waitReceipt(hash: `0x${string}`) {
    // use viem action to avoid walletClient method mismatch
    return waitForTransactionReceipt(publicClient!, { hash });
  }

  return { ensureBase, waitReceipt };
}

