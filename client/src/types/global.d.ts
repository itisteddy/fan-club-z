/* Global ambient declarations for legacy modules and browser globals */

declare module '@sentry/react' {
  const Sentry: any;
  export = Sentry;
}

declare module '@sentry/tracing' {
  export const BrowserTracing: any;
}

declare const gtag: (...args: any[]) => void;

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  isMetaMask?: boolean;
  [key: string]: any;
}

declare global {
  interface Window {
    gtag?: typeof gtag;
    ethereum?: EthereumProvider;
  }

  interface NotificationOptions {
    renotify?: boolean;
  }
}

export {};

