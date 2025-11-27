import { useReadContract } from 'wagmi';
import { useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { formatUnits, getAddress } from 'viem';

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

// Ensure proper checksumming of USDC address
function getChecksummedAddress(address: string | undefined): `0x${string}` {
  if (!address) {
    throw new Error('USDC address not configured');
  }
  // Trim whitespace and ensure it's a valid hex string
  const trimmed = address.trim();
  if (!trimmed.startsWith('0x') || trimmed.length !== 42) {
    throw new Error(`Invalid address format: ${trimmed}`);
  }
  // getAddress() will validate checksum and return properly checksummed address
  return getAddress(trimmed as `0x${string}`);
}

const USDC_ADDRESS_RAW = import.meta.env.VITE_USDC_ADDRESS_BASE_SEPOLIA || 
                          import.meta.env.VITE_BASE_USDC_ADDRESS || 
                          '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const USDC_ADDRESS = getChecksummedAddress(USDC_ADDRESS_RAW);
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
      // PERFORMANCE FIX: Increased intervals to reduce network calls
      refetchInterval: 30_000, // Refetch every 30 seconds (was 15s)
      staleTime: 20_000, // Data considered fresh for 20 seconds (was 10s)
      gcTime: 60_000, // Keep in cache for 1 minute
      retry: 2,
      // Don't refetch on window focus - reduces unnecessary calls
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
  });

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
