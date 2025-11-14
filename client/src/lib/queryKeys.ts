/**
 * Shared React Query keys for consistent cache invalidation
 * All wallet-related queries use these keys for predictable refresh
 */

export const QK = {
  walletSummary: (userId: string, walletAddress?: string | null) =>
    ['wallet', 'summary', userId, (walletAddress ?? '').toLowerCase()] as const,
  
  walletActivity: (userId: string, limit = 25) => ['wallet', 'activity', userId, limit] as const,
  
  escrowBalance: (userId: string) => ['escrow-balance', userId] as const,
  
  onchainUSDC: (address: `0x${string}` | undefined, chainId: number) =>
    ['onchain-usdc', address ?? '0x0', chainId] as const,
  
  predictionEntries: (predictionId: string) => ['prediction-entries', predictionId] as const,
  
  prediction: (predictionId: string) => ['prediction', predictionId] as const,
  
  readContract: (address: string, functionName: string, args?: any[]) => 
    ['readContract', address, functionName, args ?? []] as const,
  
  onchainActivity: (userId: string, limit = 20) => ['onchain-activity', userId, limit] as const,
} as const;

