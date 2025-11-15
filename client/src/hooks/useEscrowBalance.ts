import { useReadContract, useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getAddress } from 'viem';

// Escrow Contract Address
const ESCROW_ADDRESS = getAddress((import.meta.env.VITE_BASE_ESCROW_ADDRESS ?? 
                                   import.meta.env.VITE_ESCROW_ADDRESS_BASE_SEPOLIA ?? 
                                   '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519')) as `0x${string}`;

// Escrow ABI - just the functions we need to read balances
const ESCROW_ABI = [
  {
    type: 'function',
    name: 'balances',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'reserved',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/**
 * Hook to read user's escrow balance from the smart contract
 * Returns available balance, reserved balance, and loading state
 */
export function useEscrowBalance() {
  const { address, isConnected, chainId } = useAccount();

  // Read available balance (user's escrow balance)
  const { data: availableBalance, isLoading: isLoadingAvailable, error: errorAvailable, refetch: refetchAvailable } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && chainId === baseSepolia.id,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Read reserved balance (funds locked in active predictions)
  const { data: reservedBalance, isLoading: isLoadingReserved, error: errorReserved, refetch: refetchReserved } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'reserved',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && chainId === baseSepolia.id,
      refetchInterval: 5000, // Refetch every 5 seconds
    },
  });

  // Convert from wei (6 decimals for USDC) to USD
  const availableUSD = availableBalance ? Number(availableBalance) / 1_000_000 : 0;
  const reservedUSD = reservedBalance ? Number(reservedBalance) / 1_000_000 : 0;
  const totalUSD = availableUSD + reservedUSD;

  const isLoading = isLoadingAvailable || isLoadingReserved;
  const error = errorAvailable || errorReserved;

  const refetch = async () => {
    await Promise.all([refetchAvailable(), refetchReserved()]);
  };

  return {
    // Raw values (in USDC units - 6 decimals)
    availableBalance: availableBalance || BigInt(0),
    reservedBalance: reservedBalance || BigInt(0),
    
    // USD values (human-readable)
    availableUSD,
    reservedUSD,
    totalUSD,
    
    // State
    isLoading,
    error,
    refetch,
    
    // Connection state
    isConnected,
    chainId,
    isCorrectChain: chainId === baseSepolia.id,
  };
}
