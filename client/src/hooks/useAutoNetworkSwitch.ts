import { useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import toast from 'react-hot-toast';

/**
 * Auto-switches to Base Sepolia when wallet connects on wrong network
 */
export function useAutoNetworkSwitch() {
  const { chainId, isConnected, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  useEffect(() => {
    if (!isConnected || !address) return;
    if (chainId === baseSepolia.id) return; // Already on correct network

    // Auto-switch to Base Sepolia
    const switchNetwork = async () => {
      try {
        console.log(`[FCZ-PAY] Auto-switching from chain ${chainId} to Base Sepolia (${baseSepolia.id})`);
        await switchChainAsync({ chainId: baseSepolia.id });
        toast.success('Switched to Base Sepolia');
      } catch (error: any) {
        console.error('[FCZ-PAY] Auto network switch failed:', error);
        // Don't show error toast - the warning card will handle it
      }
    };

    // Small delay to let connection stabilize
    const timeoutId = setTimeout(switchNetwork, 500);
    return () => clearTimeout(timeoutId);
  }, [chainId, isConnected, address, switchChainAsync]);
}
