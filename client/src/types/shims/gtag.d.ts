/**
 * Google Analytics (gtag) type shims
 */

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'set',
      targetId: string,
      config?: Record<string, any>
    ) => void;
    dataLayer?: Array<any>;
  }
}

export {};
