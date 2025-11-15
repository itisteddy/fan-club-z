/**
 * Type shims for wagmi custom connectors
 */

declare module 'wagmi/connectors' {
  export interface CoinbaseWalletParameters {
    appName?: string;
    appLogoUrl?: string;
    darkMode?: boolean;
    overrideIsMetaMask?: boolean;
    headlessMode?: boolean;
    reloadOnDisconnect?: boolean;
  }
}

export {};
