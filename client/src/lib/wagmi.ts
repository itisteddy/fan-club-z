import { createConfig, http, createStorage } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { Capacitor } from '@capacitor/core';

/**
 * Clean up stale WalletConnect sessions from localStorage
 * This prevents "No matching key. session topic doesn't exist" errors
 * 
 * ENHANCED v7: Only clean up on explicit disconnect, not on page load
 * 
 * Should be called:
 * - On explicit disconnect
 * - On session errors (via triggerRecovery)
 * 
 * Should NOT be called:
 * - On app startup/page reload (let wagmi handle reconnection)
 */
export function cleanupStaleWalletConnectSessions(): number {
  let removedCount = 0;
  
  try {
    // Clear localStorage entries
    // IMPORTANT: DO NOT remove 'wagmi.store' - it contains connection state!
    const localKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Skip the main wagmi store - this holds connection state
      if (key === 'wagmi.store') continue;
      
      // Only remove WalletConnect-specific session data
      if (
        key.startsWith('wc@2:') || 
        key.startsWith('wc@1:') || 
        key.startsWith('walletconnect') ||
        key.startsWith('WALLETCONNECT') ||
        key.includes('wc_session') ||
        key.includes('@walletconnect') ||
        key.startsWith('wc_') ||
        (key.includes('pairing') && key.includes('wc')) ||
        (key.includes('relay') && key.includes('wc')) ||
        (key.includes('topic') && key.includes('wc')) ||
        key.includes('wallet-connect')
      ) {
        localKeysToRemove.push(key);
      }
    }
    
    localKeysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        removedCount++;
      } catch {}
    });

    // Clear sessionStorage entries
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('wc@2:') || 
        key.startsWith('walletconnect') ||
        key.includes('@walletconnect')
      )) {
        sessionKeysToRemove.push(key);
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        removedCount++;
      } catch {}
    });

    if (removedCount > 0 && import.meta.env.DEV) {
      console.log(`[Wagmi] Cleaned ${removedCount} stale WC sessions`);
    }
  } catch (error) {
    console.warn('[Wagmi] Error cleaning WalletConnect sessions:', error);
  }
  
  return removedCount;
}

/**
 * Check if an error is a WalletConnect session error
 */
export function isWalletConnectSessionError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMsg = String(error).toLowerCase();
  const sessionPatterns = [
    'no matching key',
    'session topic',
    'session not found',
    'pairing topic',
    'missing session',
    'inactive session',
    'session disconnected',
    'expired session',
    'please call connect() before request',
    'client not initialized',
    'peer disconnected',
    'connection closed',
    'request timeout',
    'transport error',
  ];
  
  return sessionPatterns.some(pattern => errorMsg.includes(pattern));
}

// Get project ID from environment (no fallback - require a real ID)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

type ConnectorReturn =
  | ReturnType<typeof injected>
  | ReturnType<typeof walletConnect>
  | ReturnType<typeof coinbaseWallet>;

// Always include injected connector (works for browser extensions and mobile browser wallets)
const connectors: ConnectorReturn[] = [
  injected({
    // Avoid redefining window.ethereum on environments where it's non-configurable
    // (prevents "Cannot redefine property: ethereum" errors with some wallets)
    shimDisconnect: false,
  }),
];

// Only add WalletConnect if project ID is valid
// Note: Domain must be whitelisted at https://cloud.reown.com
if (projectId && projectId.length >= 8) {
  try {
    const metadataUrl = typeof window !== 'undefined'
      ? (Capacitor?.isNativePlatform?.() ? 'https://app.fanclubz.app' : window.location.origin)
      : 'https://app.fanclubz.app';

    connectors.push(
      walletConnect({
        projectId,
        showQrModal: true,
        qrModalOptions: { 
          themeMode: 'light',
          // Better mobile support
          enableExplorer: true,
        },
        metadata: {
          name: 'Fan Club Z',
          description: 'Prediction Platform',
          url: metadataUrl,
          icons: ['https://app.fanclubz.app/icons/icon-192.png'],
        },
      })
    );
  } catch (error) {
    console.warn('[Wagmi] Failed to initialize WalletConnect connector:', error);
    // Continue without WalletConnect - injected connector will still work
  }
}

if (import.meta.env.VITE_ENABLE_COINBASE_CONNECTOR === '1') {
  const coinbaseConnector = coinbaseWallet({
    appName: 'Fan Club Z',
    preference: 'smartWalletOnly',
    headlessMode: false,
  }) as ReturnType<typeof coinbaseWallet>;

  connectors.push(coinbaseConnector);
}

// Multiple RPC endpoints for fallback - used by onchainTransactionService
export const RPC_ENDPOINTS = [
  'https://sepolia.base.org',
  'https://base-sepolia-rpc.publicnode.com',
  'https://base-sepolia.blockpi.network/v1/rpc/public',
] as const;

/**
 * CRITICAL FIX: Explicit storage configuration for wagmi
 * 
 * Without explicit storage config, wagmi may not properly persist and restore
 * wallet connections on page reload. This creates the storage with proper
 * serialization and the correct key prefix.
 */
const storage = createStorage({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'wagmi',
});

export const config = createConfig({
  chains: [baseSepolia],
  connectors,
  // CRITICAL: Explicit storage for connection persistence
  storage,
  // Sync connected state across tabs
  syncConnectedChain: true,
  // CRITICAL: Enable multiInjectedProviderDiscovery for better wallet detection
  multiInjectedProviderDiscovery: true,
  transports: {
    [baseSepolia.id]: http(RPC_ENDPOINTS[0], {
      batch: {
        batchSize: 1024,
        wait: 16,
      },
      timeout: 30_000,
      retryCount: 3,
      retryDelay: 500,
    }),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

declare module '@wagmi/core' {
  interface Register {
    config: typeof config;
  }
}
