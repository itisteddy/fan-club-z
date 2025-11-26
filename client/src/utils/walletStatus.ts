import { baseSepolia } from 'wagmi/chains';

export type WalletStatusCode = 'ready' | 'disconnected' | 'wrong_network' | 'session_unhealthy' | 'reconnecting';

export interface WalletStatusInput {
  isConnected?: boolean;
  address?: string | null;
  chainId?: number | null;
  expectedChainId?: number;
  sessionHealthy?: boolean;
  /** The wagmi status field - used to detect reconnection states */
  status?: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  /** If using stabilized hook, indicates we're in a transition */
  isTransitioning?: boolean;
}

export interface WalletStatus {
  code: WalletStatusCode;
  message: string | null;
  requiresAction: boolean;
  expectedChainId: number;
}

/**
 * Compute the high-level wallet readiness status for UI + guards.
 * 
 * IMPORTANT: This function now handles transitioning states to prevent
 * UI flicker during page navigation. When wagmi is reconnecting, we
 * return 'reconnecting' status instead of 'disconnected'.
 */
export function computeWalletStatus(input: WalletStatusInput): WalletStatus {
  const {
    isConnected,
    address,
    chainId,
    sessionHealthy = true,
    expectedChainId = baseSepolia.id,
    status,
    isTransitioning = false,
  } = input;

  // Check if we're in a reconnecting state - don't show disconnected UI during transitions
  const isReconnecting = status === 'reconnecting' || status === 'connecting' || isTransitioning;
  
  if (isReconnecting) {
    // During reconnection, don't require action - wagmi is handling it
    return {
      code: 'reconnecting',
      message: null,
      requiresAction: false,
      expectedChainId,
    };
  }

  if (!isConnected || !address) {
    return {
      code: 'disconnected',
      message: 'Connect your wallet to continue.',
      requiresAction: true,
      expectedChainId,
    };
  }

  if (chainId !== expectedChainId) {
    return {
      code: 'wrong_network',
      message: 'Switch your wallet to Base Sepolia.',
      requiresAction: true,
      expectedChainId,
    };
  }

  if (!sessionHealthy) {
    return {
      code: 'session_unhealthy',
      message: 'Wallet session expired. Please reconnect your wallet.',
      requiresAction: true,
      expectedChainId,
    };
  }

  return {
    code: 'ready',
    message: null,
    requiresAction: false,
    expectedChainId,
  };
}
