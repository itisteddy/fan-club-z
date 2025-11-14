import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { formatUnits, getAddress } from 'viem';
import { useEffect } from 'react';

// USDC ABI for balanceOf
const ERC20_BALANCE_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

const USDC_ADDRESS_RAW = import.meta.env.VITE_USDC_ADDRESS_BASE_SEPOLIA || 
                          import.meta.env.VITE_BASE_USDC_ADDRESS || 
                          '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const USDC_ADDRESS = getAddress(USDC_ADDRESS_RAW) as `0x${string}`;
const USDC_DECIMALS = Number(import.meta.env.VITE_USDC_DECIMALS || 6);

export function useUSDCBalance() {
  const { address, chainId, isConnected } = useAccount();

  const isEnabled = !!address && isConnected && chainId === baseSepolia.id;

  const { data: balance, isLoading, error, refetch } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: address ? [getAddress(address)] : undefined,
    query: {
      enabled: isEnabled,
      refetchInterval: 3_000, // Refetch every 3 seconds
      retry: 3, // Retry failed requests
      staleTime: 0, // Always consider data stale - refetch immediately when requested
    },
  });

  // Debug logging with enhanced info
  useEffect(() => {
    if (import.meta.env.VITE_DEBUG_LOGS === 'true') {
      console.log('[FCZ-PAY] useUSDCBalance:', {
        address,
        chainId,
        expectedChainId: baseSepolia.id,
        isConnected,
        usdcAddress: USDC_ADDRESS,
        enabled: isEnabled,
        balanceRaw: balance?.toString(),
        balanceFormatted: balance ? formatUnits(balance, USDC_DECIMALS) : '0',
        isLoading,
        error: error?.message,
        timestamp: new Date().toISOString(),
      });
    }
  }, [address, chainId, isConnected, balance, isLoading, error, isEnabled]);

  // Show toast notification for errors
  useEffect(() => {
    if (error && isEnabled) {
      console.error('[FCZ-PAY] USDC Balance Error:', error);
    }
  }, [error, isEnabled]);

  // Convert from wei/smallest unit to USDC (6 decimals)
  const balanceUSD = balance ? Number(formatUnits(balance, USDC_DECIMALS)) : 0;

  return {
    balance: balanceUSD,
    isLoading,
    error,
    refetch,
    hasBalance: balanceUSD > 0,
    isWrongNetwork: isConnected && chainId !== baseSepolia.id,
    usdcAddress: USDC_ADDRESS,
  };
}
