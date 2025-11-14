import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { walletConnect, injected, coinbaseWallet } from 'wagmi/connectors'

// Get project ID from environment (no fallback - require a real ID)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

const connectors = [
  injected(),
];

if (projectId && projectId.length >= 8) {
  connectors.push(
    walletConnect({
      projectId,
      showQrModal: true,
      qrModalOptions: { themeMode: 'light' },
      metadata: {
        name: 'Fan Club Z',
        description: 'Prediction Markets',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://app.fanclubz.app',
        icons: ['https://app.fanclubz.app/icon.png'],
      },
    })
  );
}

if (import.meta.env.VITE_ENABLE_COINBASE_CONNECTOR === '1') {
  connectors.push(
    coinbaseWallet({
      appName: 'Fan Club Z',
      preference: 'smartWalletOnly',
      headlessMode: false,
    })
  );
}

export const config = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
