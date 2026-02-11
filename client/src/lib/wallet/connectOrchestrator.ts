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
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useConnectors } from 'wagmi';
import { getBrowserContext, type BrowserContextInfo } from '@/lib/browserContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrchestratorState = 'idle' | 'starting' | 'awaiting_wallet' | 'connected' | 'failed';

export type ConnectionMethod = 'injected' | 'walletconnect';

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
  /** Build a deep link URL to open the wallet app (Android intent + universal link) */
  buildWalletDeepLink: (wallet?: 'metamask' | 'trust' | 'coinbase') => string | null;
  /** Whether a retry/reset operation is in progress */
  isRetrying: boolean;
}

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
      // Clean up the URI listener on unmount
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
      // Inside a wallet browser → use injected provider (no WalletConnect needed)
      chosenMethod = 'injected';
    } else {
      // System browser: check for injected first (desktop), else WalletConnect
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
      //
      // CRITICAL FIX: The `display_uri` event can fire synchronously during
      // connect(), so the listener MUST be attached first. We use a named
      // handler stored in a ref so we can cleanly remove it later without
      // nuking other listeners.
      if (chosenMethod === 'walletconnect') {
        try {
          const provider = await (connector as any).getProvider?.();
          if (provider?.on) {
            providerRef.current = provider;

            // Create a named handler for this attempt
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

      // For injected: awaiting user approval in wallet popup
      if (chosenMethod === 'injected') {
        setState('awaiting_wallet');
      }

      // Timeout for WalletConnect flows:
      // After timeout, show recovery options but DON'T kill the connection —
      // the wallet app might still complete the handshake.
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

    // Clean up URI listener
    detachUriListener();

    // Disconnect at both wagmi level AND WC provider level
    try { disconnect(); } catch {}
    await disconnectWcProvider();
    await new Promise(r => setTimeout(r, 100));

    // Clear stale storage
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
   * MUST be called from a button onClick handler (user gesture).
   *
   * For MetaMask on Android: uses intent:// with S.browser_fallback_url
   * pointing to Play Store, so if MetaMask isn't installed the user gets
   * redirected to install it instead of a silent failure.
   */
  const buildWalletDeepLink = useCallback((wallet: 'metamask' | 'trust' | 'coinbase' = 'metamask'): string | null => {
    if (!wcUri) return null;
    const encoded = encodeURIComponent(wcUri);

    if (wallet === 'metamask') {
      if (browserContext.os === 'android') {
        // Android intent with Play Store fallback if MetaMask not installed
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=io.metamask;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=io.metamask')};end`;
      }
      // iOS universal link
      return `https://metamask.app.link/wc?uri=${encoded}`;
    }

    if (wallet === 'trust') {
      if (browserContext.os === 'android') {
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=com.wallet.crypto.trustapp;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp')};end`;
      }
      return `https://link.trustwallet.com/wc?uri=${encoded}`;
    }

    if (wallet === 'coinbase') {
      if (browserContext.os === 'android') {
        return `intent://wc?uri=${encoded}#Intent;scheme=wc;package=org.toshi;S.browser_fallback_url=${encodeURIComponent('https://play.google.com/store/apps/details?id=org.toshi')};end`;
      }
      return `https://go.cb-w.com/wc?uri=${encoded}`;
    }

    return null;
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
