import { useEffect } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import toast from 'react-hot-toast';
import { useWalletConnectSession } from './useWalletConnectSession';
import { useWeb3Recovery } from '@/providers/Web3Provider';

/**
 * Auto-switches to Base Sepolia when wallet connects on wrong network
 */
export function useAutoNetworkSwitch() {
  const { chainId, isConnected, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { recoverFromError } = useWalletConnectSession();
  const { sessionHealthy } = useWeb3Recovery();

  useEffect(() => {
    if (!isConnected || !address) return;
    if (chainId === baseSepolia.id) return; // Already on correct network
    if (sessionHealthy === false) return; // Wait for reconnect before switching

    // Auto-switch to Base Sepolia
    const switchNetwork = async () => {
      try {
        console.log(`[FCZ-PAY] Auto-switching from chain ${chainId} to Base Sepolia (${baseSepolia.id})`);
        await switchChainAsync({ chainId: baseSepolia.id });
        toast.success('Switched to Base Sepolia');
      } catch (error: any) {
        console.error('[FCZ-PAY] Auto network switch failed:', error);
        const message = String(error?.message || error).toLowerCase();
        if (message.includes('connect') && message.includes('before request')) {
          await recoverFromError({ attemptReconnect: true, silent: true });
          toast.error('Wallet connection lost. Please reconnect your wallet, then switch to Base Sepolia.');
        } else {
          toast.error('Switch network failed. Please switch to Base Sepolia in your wallet.');
        }
      }
    };

    // Small delay to let connection stabilize
    const timeoutId = setTimeout(switchNetwork, 500);
    return () => clearTimeout(timeoutId);
  }, [chainId, isConnected, address, switchChainAsync, recoverFromError, sessionHealthy]);
}
