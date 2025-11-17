import { createConfig, http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors';
import { Capacitor } from '@capacitor/core';

// Get project ID from environment (no fallback - require a real ID)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined;

type ConnectorReturn =
  | ReturnType<typeof injected>
  | ReturnType<typeof walletConnect>
  | ReturnType<typeof coinbaseWallet>;

// Always include injected connector (works for browser extensions and mobile browser wallets)
const connectors: ConnectorReturn[] = [
  injected({
    // Better mobile browser wallet detection
    shimDisconnect: true,
  })
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

export const config = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
