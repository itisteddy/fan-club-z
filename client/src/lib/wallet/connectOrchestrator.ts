/**
 * Wallet Connection Orchestrator
 *
 * Single source of truth for wallet connection lifecycle.
 * Replaces the "hope the WalletConnect modal works" pattern with a
 * deterministic state machine that:
 *
 * 1. Detects browser context and picks the right connection strategy
 * 2. Generates WC URI eagerly (before rendering any CTA)
 * 3. Manages deep-link attempts with timeout + fallback
 * 4. Provides explicit cleanup + retry
 *
 * States:  idle → starting → awaiting_wallet → connected | failed
 *
 * CRITICAL INVARIANTS:
 * - showQrModal is FALSE in wagmi.ts — we own all UI
 * - URI listener attached BEFORE connect() to avoid race
 * - Deep links triggered ONLY from button onClick (user gesture)
 * - Timeout shows recovery UI but does NOT kill the connection
 * - Provider listeners are named and cleaned per-attempt
 * - Deep links are WALLET-AGNOSTIC by default (use wc: scheme on Android)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useConnectors } from 'wagmi';
import { getBrowserContext, type BrowserContextInfo } from '@/lib/browserContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrchestratorState = 'idle' | 'starting' | 'awaiting_wallet' | 'connected' | 'failed';

export type ConnectionMethod = 'injected' | 'walletconnect';

/** Supported wallet targets for deep links */
export type WalletTarget = 'generic' | 'metamask' | 'trust' | 'coinbase' | 'rainbow';

export interface WalletDeepLinkInfo {
  label: string;
  /** Short name for compact UI */
  shortLabel: string;
  /** URL to wallet's logo (hosted on WC explorer CDN or direct) */
  iconUrl: string;
  /** Build the deep link URL for this wallet given a WC URI */
  buildUrl: (wcUri: string, os: 'android' | 'ios' | 'desktop') => string | null;
}

export interface OrchestratorResult {
  state: OrchestratorState;
  /** Which method was chosen (only set after `startConnect`) */
  method: ConnectionMethod | null;
  /** WalletConnect URI for QR / deep link (only when method = walletconnect) */
  wcUri: string | null;
  /** Human-readable error message when state = failed */
  errorMessage: string | null;
  /** Browser context snapshot */
  browserContext: BrowserContextInfo;
  /** Start a new connection attempt */
  startConnect: (preferredMethod?: ConnectionMethod) => Promise<void>;
  /** Clean up stale sessions and reset to idle */
  resetAndRetry: () => Promise<void>;
  /** Cancel the current attempt and return to idle */
  cancel: () => void;
  /** Build a deep link URL — defaults to generic (OS wallet chooser) */
  buildWalletDeepLink: (wallet?: WalletTarget) => string | null;
  /** Whether a retry/reset operation is in progress */
  isRetrying: boolean;
}

// ─── Wallet Registry ─────────────────────────────────────────────────────────
//
// Static registry of popular wallets with their deep link patterns.
// Android: generic `wc:` scheme triggers OS app chooser (ideal).
// iOS: must use wallet-specific universal links (iOS doesn't have scheme chooser).

export const WALLET_REGISTRY: Record<WalletTarget, WalletDeepLinkInfo> = {
  generic: {
    label: 'Open Wallet App',
    shortLabel: 'Wallet',
    iconUrl: '', // Uses a generic wallet icon in UI
    buildUrl: (wcUri, os) => {
      const encoded = encodeURIComponent(wcUri);
      if (os === 'android') {
        // Android intent with wc: scheme — NO package restriction.
        // This triggers the OS app chooser showing ALL installed wallets
        // that registered the wc:// scheme (MetaMask, Trust, Coinbase, etc.)
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;end`;
      }
      if (os === 'ios') {
        // iOS: raw wc: URI. iOS will check if any app handles it,
        // but this is less reliable than universal links.
        // UI should prefer showing specific wallet buttons on iOS.
        return `wc:${wcUri.replace(/^wc:/, '')}`;
      }
      return null; // Desktop uses QR code
    },
  },
  metamask: {
    label: 'MetaMask',
    shortLabel: 'MetaMask',
    iconUrl: 'https://registry.walletconnect.com/api/v1/logo/md/c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    buildUrl: (wcUri, os) => {
      const encoded = encodeURIComponent(wcUri);
      if (os === 'android') {
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=io.metamask;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=io.metamask')};end`;
      }
      if (os === 'ios') {
        return `https://metamask.app.link/wc?uri=${encoded}`;
      }
      return null;
    },
  },
  trust: {
    label: 'Trust Wallet',
    shortLabel: 'Trust',
    iconUrl: 'https://registry.walletconnect.com/api/v1/logo/md/4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
    buildUrl: (wcUri, os) => {
      const encoded = encodeURIComponent(wcUri);
      if (os === 'android') {
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=com.wallet.crypto.trustapp;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp')};end`;
      }
      if (os === 'ios') {
        return `https://link.trustwallet.com/wc?uri=${encoded}`;
      }
      return null;
    },
  },
  coinbase: {
    label: 'Coinbase Wallet',
    shortLabel: 'Coinbase',
    iconUrl: 'https://registry.walletconnect.com/api/v1/logo/md/fd20dc426fb37566d803205b19bbc1d4096b248ac04548e18e75ee6b23ab0b24',
    buildUrl: (wcUri, os) => {
      const encoded = encodeURIComponent(wcUri);
      if (os === 'android') {
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=org.toshi;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.toshi')};end`;
      }
      if (os === 'ios') {
        return `https://go.cb-w.com/wc?uri=${encoded}`;
      }
      return null;
    },
  },
  rainbow: {
    label: 'Rainbow',
    shortLabel: 'Rainbow',
    iconUrl: 'https://registry.walletconnect.com/api/v1/logo/md/1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
    buildUrl: (wcUri, os) => {
      const encoded = encodeURIComponent(wcUri);
      if (os === 'android') {
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=me.rainbow;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=me.rainbow')};end`;
      }
      if (os === 'ios') {
        return `https://rnbwapp.com/wc?uri=${encoded}`;
      }
      return null;
    },
  },
};

/** Ordered list of wallets to show in iOS picker (iOS needs specific universal links) */
export const IOS_WALLET_ORDER: WalletTarget[] = ['metamask', 'trust', 'coinbase', 'rainbow'];

// ─── Constants ───────────────────────────────────────────────────────────────

// Android mobile networks can be slow; WC relay needs time.
// Show recovery UI after this, but DON'T auto-cancel — let connection continue.
const WALLET_TIMEOUT_MS = 15000;

// ─── Instrumentation ─────────────────────────────────────────────────────────

function log(event: string, data?: Record<string, unknown>) {
  console.log(`[Orchestrator] ${event}`, data ?? '');
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWalletOrchestrator(): OrchestratorResult {
  const { isConnected, address } = useAccount();
  const { connect, connectors, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const allConnectors = useConnectors();

  const [state, setState] = useState<OrchestratorState>(isConnected ? 'connected' : 'idle');
  const [method, setMethod] = useState<ConnectionMethod | null>(null);
  const [wcUri, setWcUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const stateRef = useRef(state);
  const uriHandlerRef = useRef<((uri: string) => void) | null>(null);
  const providerRef = useRef<any>(null);
  const browserContext = getBrowserContext();

  // Keep stateRef in sync
  useEffect(() => { stateRef.current = state; }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      detachUriListener();
    };
  }, []);

  // Sync with wagmi's connected state — handles success from any path
  useEffect(() => {
    if (isConnected && address) {
      if (stateRef.current !== 'idle' && stateRef.current !== 'connected') {
        log('connected_via_wagmi_sync', { address });
      }
      setState('connected');
      setErrorMessage(null);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isConnected, address]);

  // Watch for connect failures from wagmi
  useEffect(() => {
    if (connectStatus === 'error' && (stateRef.current === 'starting' || stateRef.current === 'awaiting_wallet')) {
      if (mountedRef.current) {
        setState('failed');
        setErrorMessage('Wallet connection failed. Please try again.');
        log('wagmi_connect_error');
      }
    }
  }, [connectStatus]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const findConnector = useCallback((type: 'injected' | 'walletConnect') => {
    return connectors.find(c => c.id === type) || allConnectors.find(c => c.id === type);
  }, [connectors, allConnectors]);

  /** Detach the current URI listener from the WC provider */
  function detachUriListener() {
    if (providerRef.current && uriHandlerRef.current) {
      try {
        providerRef.current.removeListener?.('display_uri', uriHandlerRef.current);
      } catch {}
    }
    uriHandlerRef.current = null;
    providerRef.current = null;
  }

  /**
   * Clean stale WalletConnect sessions from storage.
   * Does NOT touch wagmi.store (connection persistence).
   */
  const cleanupWcStorage = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || key === 'wagmi.store') continue;
        if (
          key.startsWith('wc@2:') ||
          key.startsWith('wc@1:') ||
          key.startsWith('walletconnect') ||
          key.startsWith('WALLETCONNECT') ||
          key.includes('wc_session') ||
          key.includes('@walletconnect') ||
          key.startsWith('wc_')
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });

      const sKeys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('wc@2:') || key.startsWith('walletconnect') || key.includes('@walletconnect'))) {
          sKeys.push(key);
        }
      }
      sKeys.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });

      const total = keysToRemove.length + sKeys.length;
      if (total > 0) {
        log('cleaned_wc_storage', { count: total });
      }
    } catch {}
  }, []);

  /**
   * Disconnect the WC provider at the SignClient level (not just wagmi).
   * This ensures the relay subscription is torn down and a fresh pairing
   * will be created on the next connect() call.
   */
  const disconnectWcProvider = useCallback(async () => {
    const wcConnector = findConnector('walletConnect');
    if (!wcConnector) return;
    try {
      const provider = await (wcConnector as any).getProvider?.();
      if (provider?.disconnect) {
        await provider.disconnect().catch(() => {});
        log('wc_provider_disconnected');
      }
    } catch {}
  }, [findConnector]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const startConnect = useCallback(async (preferredMethod?: ConnectionMethod) => {
    // Determine strategy
    let chosenMethod: ConnectionMethod;

    if (preferredMethod) {
      chosenMethod = preferredMethod;
    } else if (browserContext.context === 'wallet_inapp' && browserContext.injectedEthereumAvailable) {
      chosenMethod = 'injected';
    } else {
      const hasInjected = browserContext.injectedEthereumAvailable;
      if (hasInjected && !browserContext.isMobile) {
        chosenMethod = 'injected';
      } else {
        chosenMethod = 'walletconnect';
      }
    }

    log('start_connect', {
      chosenMethod,
      context: browserContext.context,
      inAppName: browserContext.inAppName,
      os: browserContext.os,
      isMobile: browserContext.isMobile,
      injectedAvailable: browserContext.injectedEthereumAvailable,
    });

    setMethod(chosenMethod);
    setState('starting');
    setErrorMessage(null);
    setWcUri(null);

    // Clean up any previous URI listener
    detachUriListener();

    const connector = findConnector(chosenMethod === 'injected' ? 'injected' : 'walletConnect');
    if (!connector) {
      setState('failed');
      setErrorMessage(
        chosenMethod === 'injected'
          ? 'No wallet extension found. Install MetaMask or open this page in a wallet browser.'
          : 'WalletConnect is not configured. Please contact support.'
      );
      log('connector_not_found', { chosenMethod });
      return;
    }

    try {
      // For WalletConnect: register URI listener BEFORE calling connect().
      if (chosenMethod === 'walletconnect') {
        try {
          const provider = await (connector as any).getProvider?.();
          if (provider?.on) {
            providerRef.current = provider;
            const handler = (uri: string) => {
              if (mountedRef.current) {
                log('wc_uri_captured', { hasUri: !!uri, uriLength: uri?.length });
                setWcUri(uri);
                setState('awaiting_wallet');
              }
            };
            uriHandlerRef.current = handler;
            provider.on('display_uri', handler);
          }
        } catch (providerErr) {
          log('wc_provider_setup_failed', { error: String(providerErr) });
        }
      }

      // Start connection
      connect({ connector }, {
        onSuccess: () => {
          if (mountedRef.current) {
            log('connect_success_callback');
            setState('connected');
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }
        },
        onError: (err) => {
          if (mountedRef.current) {
            const msg = err?.message || 'Connection failed';
            log('connect_error_callback', { message: msg });
            if (msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied')) {
              setState('idle');
              setErrorMessage(null);
            } else {
              setState('failed');
              setErrorMessage(msg);
            }
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
          }
        },
      });

      if (chosenMethod === 'injected') {
        setState('awaiting_wallet');
      }

      if (chosenMethod === 'walletconnect') {
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current && stateRef.current !== 'connected' && stateRef.current !== 'idle') {
            log('timeout_showing_recovery');
            setState('failed');
            setErrorMessage('Taking too long? Try opening your wallet app, or use the options below.');
          }
        }, WALLET_TIMEOUT_MS);
      }

    } catch (err: any) {
      if (mountedRef.current) {
        log('start_connect_exception', { error: err?.message });
        setState('failed');
        setErrorMessage(err?.message || 'Failed to start wallet connection');
      }
    }
  }, [browserContext, connect, findConnector]);

  const resetAndRetry = useCallback(async () => {
    log('reset_and_retry');
    setIsRetrying(true);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    detachUriListener();

    try { disconnect(); } catch {}
    await disconnectWcProvider();
    await new Promise(r => setTimeout(r, 100));

    cleanupWcStorage();
    await new Promise(r => setTimeout(r, 200));

    if (mountedRef.current) {
      setState('idle');
      setMethod(null);
      setWcUri(null);
      setErrorMessage(null);
      setIsRetrying(false);
    }
  }, [disconnect, disconnectWcProvider, cleanupWcStorage]);

  const cancel = useCallback(() => {
    log('cancel');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    detachUriListener();
    setState('idle');
    setMethod(null);
    setWcUri(null);
    setErrorMessage(null);
  }, []);

  /**
   * Build wallet deep link URL.
   *
   * MUST be called from a button onClick handler (user gesture).
   *
   * - `'generic'` (default): On Android, uses `wc:` scheme with no package
   *   restriction — triggers OS app chooser showing ALL installed WC wallets.
   *   On iOS, uses the raw `wc:` URI.
   *
   * - Specific wallet (e.g. 'metamask'): Uses wallet-specific deep link /
   *   universal link. On Android, includes `S.browser_fallback_url` pointing
   *   to Play Store if the wallet isn't installed.
   */
  const buildWalletDeepLink = useCallback((wallet: WalletTarget = 'generic'): string | null => {
    if (!wcUri) return null;
    const info = WALLET_REGISTRY[wallet];
    if (!info) return null;
    return info.buildUrl(wcUri, browserContext.os);
  }, [wcUri, browserContext.os]);

  return {
    state,
    method,
    wcUri,
    errorMessage,
    browserContext,
    startConnect,
    resetAndRetry,
    cancel,
    buildWalletDeepLink,
    isRetrying,
  };
}
