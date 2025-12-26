import { useReadContract, useAccount } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getAddress } from 'viem';
import { useEffect } from 'react';

// Escrow Contract Address - MUST come from env, never hardcoded
function resolveEscrowAddress(): `0x${string}` {
  const primary = import.meta.env.VITE_BASE_ESCROW_ADDRESS;
  const legacy = import.meta.env.VITE_ESCROW_ADDRESS_BASE_SEPOLIA;
  if (primary && legacy && primary.trim().toLowerCase() !== legacy.trim().toLowerCase()) {
    // Hard guard: refuse to silently choose between two different escrow addresses.
    throw new Error(
      `[FCZ-PAY] Escrow address mismatch. VITE_BASE_ESCROW_ADDRESS (${primary}) !== VITE_ESCROW_ADDRESS_BASE_SEPOLIA (${legacy}). Fix env to a single canonical escrow.`
    );
  }
  const raw = primary ?? legacy;

  if (!raw) {
    // Fail fast and surface configuration issue in console
    console.error(
      '[FCZ-PAY] Escrow address not configured. Set VITE_BASE_ESCROW_ADDRESS in Vercel env.'
    );
    throw new Error('Escrow address not configured');
  }

  const checksummed = getAddress(raw as `0x${string}`);
  return checksummed as `0x${string}`;
}

const ESCROW_ADDRESS = resolveEscrowAddress();

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
 * 
 * PERFORMANCE FIX v2: Reduced refetch frequency to improve app performance
 */
export function useEscrowBalance() {
  const { address, isConnected, chainId } = useAccount();

  const persistedAddress = typeof window !== 'undefined' ? getPersistedAddress() : undefined;
  const effectiveAddress = address ?? persistedAddress;
  
  // CRITICAL FIX: Enable query even if chainId is undefined during hydration
  // We know we're on Base Sepolia if we have an address (from persisted state or connected)
  const isEnabled = !!effectiveAddress && (chainId === baseSepolia.id || chainId === undefined);

  // AGGRESSIVE DEBUGGING
  if (typeof window !== 'undefined') {
    console.log('[FCZ-PAY] useEscrowBalance state:', {
      address,
      persistedAddress,
      effectiveAddress,
      chainId,
      isEnabled,
      escrowAddress: ESCROW_ADDRESS,
    });
  }

  // Read available balance (user's escrow balance)
  const { data: availableBalance, isLoading: isLoadingAvailable, error: errorAvailable, refetch: refetchAvailable } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'balances',
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: {
      enabled: isEnabled,
      // CRITICAL FIX: Force refetch on mount to ensure we get latest balance
      refetchOnMount: true,
      refetchInterval: 10_000, // Refetch every 10 seconds for faster updates
      staleTime: 5_000, // Data considered fresh for only 5 seconds
      gcTime: 30_000, // Keep in cache for 30 seconds
      retry: 3, // More retries
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    },
  });

  // Read reserved balance (funds locked in active predictions)
  const { data: reservedBalance, isLoading: isLoadingReserved, error: errorReserved, refetch: refetchReserved } = useReadContract({
    address: ESCROW_ADDRESS,
    abi: ESCROW_ABI,
    functionName: 'reserved',
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: {
      enabled: isEnabled,
      // CRITICAL FIX: Force refetch on mount to ensure we get latest balance
      refetchOnMount: true,
      refetchInterval: 10_000, // Refetch every 10 seconds for faster updates
      staleTime: 5_000, // Data considered fresh for only 5 seconds
      gcTime: 30_000, // Keep in cache for 30 seconds
      retry: 3, // More retries
      refetchOnWindowFocus: true, // Refetch when user returns to tab
    },
  });

  // Convert from wei (6 decimals for USDC) to USD
  const availableUSD = availableBalance ? Number(availableBalance) / 1_000_000 : 0;
  const reservedUSD = reservedBalance ? Number(reservedBalance) / 1_000_000 : 0;
  const totalUSD = availableUSD + reservedUSD;

  // AGGRESSIVE DEBUGGING - Always log in production too for troubleshooting
  if (typeof window !== 'undefined' && isEnabled) {
    console.log('[FCZ-PAY] Escrow balance (on-chain):', {
      effectiveAddress,
      availableBalance: availableBalance?.toString(),
      reservedBalance: reservedBalance?.toString(),
      availableUSD,
      reservedUSD,
      totalUSD,
      isLoadingAvailable,
      isLoadingReserved,
      errorAvailable: errorAvailable?.message,
      errorReserved: errorReserved?.message,
    });
  }

  const isLoading = isLoadingAvailable || isLoadingReserved;
  const error = errorAvailable || errorReserved;

  const refetch = async () => {
    await Promise.all([refetchAvailable(), refetchReserved()]);
  };

  // CRITICAL FIX: Force immediate refetch when address becomes available
  useEffect(() => {
    if (isEnabled && effectiveAddress) {
      // Small delay to ensure wagmi is ready
      const timer = setTimeout(() => {
        console.log('[FCZ-PAY] Forcing escrow balance refetch for:', effectiveAddress);
        refetch();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEnabled, effectiveAddress]); // eslint-disable-line react-hooks/exhaustive-deps

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

function getPersistedAddress(): `0x${string}` | undefined {
  try {
    const store = localStorage.getItem('wagmi.store');
    if (!store) return undefined;
    const parsed = JSON.parse(store);
    const connections = parsed?.state?.connections?.value;
    const current = parsed?.state?.current;
    if (current && Array.isArray(connections)) {
      const match = connections.find(
        (entry: any) => Array.isArray(entry) && entry[0] === current && entry[1]?.accounts?.length
      );
      if (match) {
        return match[1].accounts[0] as `0x${string}`;
      }
    }
    if (Array.isArray(connections)) {
      for (const entry of connections) {
        if (Array.isArray(entry) && entry[1]?.accounts?.length) {
          return entry[1].accounts[0] as `0x${string}`;
        }
      }
    }
  } catch {
    // Ignore store errors
  }
  return undefined;
}
