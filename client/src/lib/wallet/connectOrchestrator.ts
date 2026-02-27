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
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { getBrowserContext, type BrowserContextInfo } from '@/lib/browserContext';
import { hasWalletConnectProjectId } from '@/lib/wallet/walletConfig';

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
  /** Lightweight diagnostics for debugging connection failures */
  diagnostics: {
    connectorIds: string[];
    hasWalletConnectProjectId: boolean;
    platform: string;
    context: BrowserContextInfo['context'];
    inAppName: BrowserContextInfo['inAppName'];
  };
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

// Show recovery UI after this, but DON'T auto-cancel — let connection continue.
// Native apps need more time because:
// 1. App backgrounding kills WebSocket (WC relay)
// 2. Android/iOS resume takes time to re-establish connections
// 3. The visibilitychange handler needs multiple reconnect attempts
// FIX (2026-02-11): Use build target as fallback for native detection.
const IS_NATIVE_APP = Capacitor.isNativePlatform() ||
  import.meta.env.VITE_BUILD_TARGET === 'android' ||
  import.meta.env.VITE_BUILD_TARGET === 'ios';
const WALLET_TIMEOUT_MS = IS_NATIVE_APP ? 30000 : 15000;

// ─── Instrumentation ─────────────────────────────────────────────────────────

function log(event: string, data?: Record<string, unknown>) {
  if (!(import.meta.env.DEV || import.meta.env.VITE_DEBUG_WALLET === 'true')) return;
  console.log(`[Orchestrator] ${event}`, data ?? '');
}

function isTransientWalletConnectError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('websocket') ||
    m.includes('connection closed') ||
    m.includes('transport') ||
    m.includes('timeout') ||
    m.includes('network request failed') ||
    m.includes('network error') ||
    m.includes('socket')
  );
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
  const accountRef = useRef({ isConnected, address });
  const uriHandlerRef = useRef<((uri: string) => void) | null>(null);
  const providerRef = useRef<any>(null);
  const findConnectorRef = useRef<((type: 'injected' | 'walletConnect') => any) | null>(null);
  const browserContext = getBrowserContext();

  // Keep stateRef and accountRef in sync so async handlers read fresh values
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { accountRef.current = { isConnected, address }; }, [isConnected, address]);

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

  // CRITICAL: When the user returns from the wallet app (page becomes visible again),
  // the WC session may have been established while the page was backgrounded/suspended.
  // wagmi's reactivity might not fire during suspension, so we:
  // 1. Call wagmi reconnect() to force it to re-check provider state
  // 2. Check the WC provider directly for active sessions
  // 3. After a delay, re-check if connection was established via accountRef
  //
  // On Android native, the WebView's WebSocket connections die when backgrounded.
  // The WC relay may have received the session approval, but the local provider
  // doesn't know about it. We need to poke the provider and wagmi multiple times
  // to pick up the session.
  //
  // FIX (2026-02-12): The WC SignClient locally stores approved sessions in
  // IndexedDB/localStorage even when the relay WebSocket dies. When the app
  // returns to foreground, the provider's `.session` property may already
  // reflect the approved session — but wagmi's connector state is stale
  // because it didn't receive the WebSocket event. We now check the provider's
  // session store FIRST (fast, synchronous) before attempting relay reconnects.
  // We also restart the WC provider's transport to re-establish the relay,
  // which allows wagmi to pick up the session on subsequent reconnect() calls.
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      if (stateRef.current !== 'awaiting_wallet' && stateRef.current !== 'starting' && stateRef.current !== 'failed') return;
      log('visibility_restored_checking_connection');

      // Step 1: Force wagmi to re-check all connectors for active sessions
      try {
        const { reconnect: wagmiReconnect } = await import('wagmi/actions');
        const { config } = await import('@/lib/wagmi');
        await wagmiReconnect(config).catch(() => {});
      } catch {}

      // Step 2: Check if already connected after reconnect
      await new Promise(r => setTimeout(r, 500));
      if (!mountedRef.current) return;
      if (accountRef.current.isConnected && accountRef.current.address) {
        log('connected_on_visibility_restore_immediate', { address: accountRef.current.address });
        setState('connected');
        setErrorMessage(null);
        clearConnectTimeout();
        return;
      }

      // Step 3: For WalletConnect, the relay WebSocket may have died.
      // Poke the WC provider to re-establish the relay and check for pending sessions.
      if (providerRef.current) {
        try {
          // Some WC providers expose a restartTransport or similar method
          const provider = providerRef.current;
          // Access the WC client's session to check if approval came through
          if (provider.session || provider.client?.session?.values?.length > 0) {
            log('wc_session_found_on_provider_after_resume');
            // Force wagmi to pick it up
            const { reconnect: wagmiReconnect } = await import('wagmi/actions');
            const { config } = await import('@/lib/wagmi');
            await wagmiReconnect(config).catch(() => {});
          }
        } catch (e) {
          log('wc_provider_check_failed', { error: String(e) });
        }
      }

      // Step 4: Final check after more time for wagmi to process
      await new Promise(r => setTimeout(r, 1000));
      if (!mountedRef.current) return;
      if (accountRef.current.isConnected && accountRef.current.address) {
        log('connected_on_visibility_restore_delayed', { address: accountRef.current.address });
        setState('connected');
        setErrorMessage(null);
        clearConnectTimeout();
        return;
      }

      // Step 5: One more aggressive reconnect attempt for Android where WebSocket
      // connections are frequently killed during backgrounding
      try {
        const { getAccount, reconnect: wagmiReconnect } = await import('wagmi/actions');
        const { config } = await import('@/lib/wagmi');
        await wagmiReconnect(config).catch(() => {});
        const acct = getAccount(config);
        if (acct.isConnected && acct.address) {
          log('connected_on_visibility_restore_final', { address: acct.address });
          setState('connected');
          setErrorMessage(null);
          clearConnectTimeout();
          return;
        }
      } catch {}

      // Step 6 (Native Android): The WC session might have been approved while
      // the WebView was completely frozen. The SignClient has the session locally
      // (from relay before backgrounding) but wagmi's connector doesn't know about it.
      // Try to get the WC provider, check its sessions, and if we find an active one,
      // explicitly tell wagmi to reconnect using that connector.
      if (IS_NATIVE_APP && providerRef.current) {
        try {
          const provider = providerRef.current;
          // WalletConnect v2 provider stores sessions in provider.session or client.session
          const hasSession = provider.session ||
            (provider.signer?.session) ||
            (provider.client?.session?.values?.length > 0);
          if (hasSession) {
            log('wc_active_session_found_forcing_reconnect');
            // Attempt to force wagmi to re-evaluate the WC connector
            const wcConnector = findConnectorRef.current?.('walletConnect');
            if (wcConnector) {
              const { connect: wagmiConnect } = await import('wagmi/actions');
              const { config } = await import('@/lib/wagmi');
              try {
                await wagmiConnect(config, { connector: wcConnector as any });
              } catch (e) {
                log('wc_force_reconnect_failed', { error: String(e) });
              }
              // Final check
              await new Promise(r => setTimeout(r, 500));
              if (accountRef.current.isConnected && accountRef.current.address) {
                log('connected_after_forced_reconnect', { address: accountRef.current.address });
                setState('connected');
                setErrorMessage(null);
                clearConnectTimeout();
                return;
              }
            }
          }
        } catch (e) {
          log('native_session_recovery_failed', { error: String(e) });
        }
      }

      // Step 6b (2026-02-11): If the provider ref is null (e.g., garbage collected during
      // backgrounding), try to get a fresh WC provider from the connector and check sessions.
      if (IS_NATIVE_APP && !providerRef.current) {
        try {
          const wcConnector = findConnectorRef.current?.('walletConnect');
          if (wcConnector) {
            const freshProvider = await (wcConnector as any).getProvider?.();
            if (freshProvider) {
              const hasSession = freshProvider.session ||
                (freshProvider.signer?.session) ||
                (freshProvider.client?.session?.values?.length > 0);
              if (hasSession) {
                log('wc_session_found_via_fresh_provider');
                const { connect: wagmiConnect } = await import('wagmi/actions');
                const { config } = await import('@/lib/wagmi');
                try {
                  await wagmiConnect(config, { connector: wcConnector as any });
                } catch (e) {
                  log('wc_fresh_provider_connect_failed', { error: String(e) });
                }
                await new Promise(r => setTimeout(r, 500));
                if (accountRef.current.isConnected && accountRef.current.address) {
                  log('connected_via_fresh_provider', { address: accountRef.current.address });
                  setState('connected');
                  setErrorMessage(null);
                  clearConnectTimeout();
                  return;
                }
              }
            }
          }
        } catch (e) {
          log('fresh_provider_recovery_failed', { error: String(e) });
        }
      }

      // Step 7: On native platforms, WebSocket re-establishment is VERY slow.
      // Instead of one long timeout, poll every 2s for up to 20s total.
      // Each poll attempt forces a wagmi reconnect to pick up any sessions
      // that were established while the app was backgrounded.
      //
      // FIX (2026-02-12): On the FIRST poll, try to restart the WC provider's
      // WebSocket transport. The SignClient may have the approved session
      // locally but the relay transport is dead. Restarting it lets the
      // provider emit 'session_event' which wagmi listens for.
      if (IS_NATIVE_APP && (stateRef.current === 'awaiting_wallet' || stateRef.current === 'starting')) {
        log('visibility_restore_starting_native_poll');
        clearConnectTimeout();
        let pollCount = 0;
        const maxPolls = 10; // 10 polls x 2s = 20s total
        let transportRestarted = false;
        const pollInterval = setInterval(async () => {
          pollCount++;
          if (!mountedRef.current || stateRef.current === 'connected' || stateRef.current === 'idle') {
            clearInterval(pollInterval);
            return;
          }
          if (accountRef.current.isConnected && accountRef.current.address) {
            log('native_poll_connected', { attempt: pollCount });
            setState('connected');
            setErrorMessage(null);
            clearInterval(pollInterval);
            return;
          }

          // (2026-02-12) On first poll, restart the WC relay transport.
          // This re-establishes the WebSocket so the provider can emit
          // session approval events that wagmi is waiting for.
          if (!transportRestarted) {
            transportRestarted = true;
            try {
              const wcConnector = findConnectorRef.current?.('walletConnect');
              if (wcConnector) {
                const provider = providerRef.current || await (wcConnector as any).getProvider?.();
                if (provider) {
                  // Try multiple transport restart methods (API varies by WC version)
                  if (typeof provider.restartTransport === 'function') {
                    await provider.restartTransport().catch(() => {});
                    log('native_poll_transport_restarted_via_method');
                  } else if (provider.client?.core?.relayer) {
                    // WalletConnect v2: restart relay transport directly
                    try {
                      await provider.client.core.relayer.transportClose().catch(() => {});
                      await new Promise(r => setTimeout(r, 200));
                      await provider.client.core.relayer.transportOpen().catch(() => {});
                      log('native_poll_relay_transport_restarted');
                    } catch (e) {
                      log('native_poll_relay_restart_failed', { error: String(e) });
                    }
                  }
                  // Update provider ref in case it was stale
                  if (!providerRef.current) providerRef.current = provider;
                }
              }
            } catch (e) {
              log('native_poll_transport_restart_error', { error: String(e) });
            }
          }

          // Force reconnect on each poll
          try {
            const { reconnect: wagmiReconnect } = await import('wagmi/actions');
            const { config } = await import('@/lib/wagmi');
            await wagmiReconnect(config).catch(() => {});
          } catch {}
          // Re-check after reconnect
          await new Promise(r => setTimeout(r, 300));
          if (accountRef.current.isConnected && accountRef.current.address) {
            log('native_poll_connected_after_reconnect', { attempt: pollCount });
            setState('connected');
            setErrorMessage(null);
            clearInterval(pollInterval);
            return;
          }
          // (2026-02-11) Also check WC provider sessions on each poll.
          // The relay may have re-established but wagmi.reconnect() doesn't always
          // pick up the session because the connector's internal state is stale.
          try {
            const wcConnector = findConnectorRef.current?.('walletConnect');
            if (wcConnector) {
              const provider = providerRef.current || await (wcConnector as any).getProvider?.();
              if (provider) {
                // Check for active sessions in all known locations
                const hasSession = provider.session ||
                  (provider.signer?.session) ||
                  (provider.client?.session?.values?.length > 0) ||
                  // (2026-02-12) Also check the SignClient's session store directly
                  (provider.client?.session?.getAll?.()?.length > 0);
                if (hasSession) {
                  log('native_poll_session_found_forcing_connect', { attempt: pollCount });
                  const { connect: wagmiConnect } = await import('wagmi/actions');
                  const { config: wagmiCfg } = await import('@/lib/wagmi');
                  try {
                    await wagmiConnect(wagmiCfg, { connector: wcConnector as any });
                  } catch {}
                  await new Promise(r => setTimeout(r, 300));
                  if (accountRef.current.isConnected && accountRef.current.address) {
                    log('native_poll_connected_after_force_connect', { attempt: pollCount });
                    setState('connected');
                    setErrorMessage(null);
                    clearInterval(pollInterval);
                    return;
                  }
                }
              }
            }
          } catch {}
          if (pollCount >= maxPolls) {
            log('native_poll_exhausted');
            clearInterval(pollInterval);
            setState('failed');
            setErrorMessage('Connection timed out. Please try again.');
          }
        }, 2000);
        return;
      }

      // Non-native: short reconnect polling after wallet handoff.
      // This catches sessions that arrive slightly after tab/app resumes.
      if (stateRef.current === 'awaiting_wallet' || stateRef.current === 'starting') {
        log('visibility_restore_non_native_poll');
        clearConnectTimeout();

        let attempts = 0;
        const maxAttempts = 6; // ~9s total
        const interval = window.setInterval(async () => {
          attempts += 1;

          if (!mountedRef.current || stateRef.current === 'connected' || stateRef.current === 'idle') {
            window.clearInterval(interval);
            return;
          }

          if (accountRef.current.isConnected && accountRef.current.address) {
            setState('connected');
            setErrorMessage(null);
            window.clearInterval(interval);
            return;
          }

          try {
            const { reconnect: wagmiReconnect } = await import('wagmi/actions');
            const { config } = await import('@/lib/wagmi');
            await wagmiReconnect(config).catch(() => {});
          } catch {}

          if (attempts >= maxAttempts) {
            window.clearInterval(interval);
            if (accountRef.current.isConnected && accountRef.current.address) {
              setState('connected');
              setErrorMessage(null);
              return;
            }
            setState('failed');
            setErrorMessage('Connection timed out. Please try again.');
          }
        }, 1500);
        return;
      }

      log('visibility_restore_no_connection_found');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []); // Empty deps — uses refs for fresh state

  // Native app lifecycle fallback:
  // On some Android/iOS devices the visibility event is unreliable after deep-link
  // handoff to wallet apps. Mirror "resume" into the visibility recovery flow.
  useEffect(() => {
    if (!IS_NATIVE_APP) return;

    let handle: PluginListenerHandle | null = null;
    void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      log('app_state_active');
      if (typeof document === 'undefined') return;
      try {
        document.dispatchEvent(new Event('visibilitychange'));
      } catch {}
    }).then((listener) => {
      handle = listener;
    }).catch((error) => {
      log('app_state_listener_failed', { error: String(error) });
    });

    return () => {
      void handle?.remove();
    };
  }, []);

  // Watch for connect failures from wagmi
  useEffect(() => {
    if (connectStatus === 'error' && (stateRef.current === 'starting' || stateRef.current === 'awaiting_wallet')) {
      // Ignore transient errors while the app is backgrounded during wallet handoff.
      if (method === 'walletconnect' && typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        log('wagmi_connect_error_while_hidden_ignored');
        return;
      }
      // CRITICAL: On mobile WalletConnect, wagmi often fires 'error' transiently
      // when the user returns from the wallet app. The WebSocket relay dies during
      // backgrounding and wagmi sees it as a connection failure. But the session
      // may actually be established — the visibility handler will pick it up.
      // Delay the failure state to give the visibility handler time to reconnect.
      if (method === 'walletconnect' && typeof document !== 'undefined' && document.visibilityState === 'visible') {
        log('wagmi_connect_error_delaying_for_visibility_handler');
        setTimeout(() => {
          if (!mountedRef.current) return;
          // Re-check: if we're now connected, don't show failure
          if (stateRef.current === 'connected') return;
          if (accountRef.current.isConnected && accountRef.current.address) {
            setState('connected');
            setErrorMessage(null);
            clearConnectTimeout();
            return;
          }
          setState('failed');
          setErrorMessage('Wallet connection failed. Please try again.');
          log('wagmi_connect_error_confirmed');
        }, 2000);
        return;
      }
      if (mountedRef.current) {
        setState('failed');
        setErrorMessage('Wallet connection failed. Please try again.');
        log('wagmi_connect_error');
      }
    }
  }, [connectStatus, method]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Find a connector by type. wagmi connector IDs can vary by version:
   * - wagmi v2: 'walletConnect', 'injected'
   * - some builds: 'io.metamask', 'WalletConnect', etc.
   * Search both the `connect()` connectors list AND the global connectors list,
   * using case-insensitive matching and common aliases.
   */
  const findConnector = useCallback((type: 'injected' | 'walletConnect') => {
    const search = (list: readonly { id: string; type?: string; name?: string }[]) => {
      // Exact match first
      const exact = list.find(c => c.id === type);
      if (exact) return exact;
      // Case-insensitive match
      const lower = type.toLowerCase();
      const ci = list.find(c => c.id.toLowerCase() === lower);
      if (ci) return ci;
      // Partial / alias match
      if (type === 'walletConnect') {
        return list.find(c =>
          c.id.toLowerCase().includes('walletconnect') ||
          c.type === 'walletConnect' ||
          (c.name || '').toLowerCase().includes('walletconnect')
        );
      }
      if (type === 'injected') {
        return list.find(c =>
          c.id === 'injected' ||
          c.type === 'injected'
        );
      }
      return undefined;
    };
    return search(connectors) || search(allConnectors);
  }, [connectors, allConnectors]);

  // Keep ref in sync for use in async handlers (visibility change)
  useEffect(() => { findConnectorRef.current = findConnector; }, [findConnector]);

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

  function clearConnectTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
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
    } else if (browserContext.injectedEthereumAvailable) {
      // Prefer injected everywhere when available (wallet in-app browsers first).
      chosenMethod = 'injected';
    } else {
      chosenMethod = 'walletconnect';
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

    const connectorType = chosenMethod === 'injected' ? 'injected' : 'walletConnect';
    let connector = findConnector(connectorType);

    // NATIVE FALLBACK: On native Android/iOS, wagmi connectors are lazily registered.
    // The connector list from useConnect() and useConnectors() may not include the WC
    // connector immediately after wagmi init. If findConnector fails, try importing
    // the config directly and checking its connectors.
    if (!connector && connectorType === 'walletConnect') {
      try {
        const { config: wagmiConfig } = await import('@/lib/wagmi');
        // Try multiple access paths — wagmi internals vary by version
        const configConnectors = (wagmiConfig as any)._internal?.connectors?.getAll?.() 
          || (wagmiConfig as any).connectors 
          || [];
        const wcFromConfig = (Array.isArray(configConnectors) ? configConnectors : []).find(
          (c: any) => c.id?.toLowerCase().includes('walletconnect') || c.type === 'walletConnect'
        );
        if (wcFromConfig) {
          log('connector_found_via_config_fallback', { id: wcFromConfig.id });
          connector = wcFromConfig;
        }
      } catch (e) {
        log('config_fallback_failed', { error: String(e) });
      }
    }

    // NATIVE FALLBACK 2 (2026-02-11): If still no connector on native, try getConnectors()
    // from wagmi/actions which reads directly from the config store.
    if (!connector && connectorType === 'walletConnect') {
      try {
        const { getConnectors } = await import('wagmi/actions');
        const { config: wagmiConfig } = await import('@/lib/wagmi');
        const actionConnectors = getConnectors(wagmiConfig);
        const wcFromActions = actionConnectors.find(
          (c: any) => c.id?.toLowerCase().includes('walletconnect') || c.type === 'walletConnect'
        );
        if (wcFromActions) {
          log('connector_found_via_actions_fallback', { id: wcFromActions.id });
          connector = wcFromActions;
        }
      } catch (e) {
        log('actions_fallback_failed', { error: String(e) });
      }
    }

    if (!connector) {
      setState('failed');
      const hasProjectId = hasWalletConnectProjectId();
      const connectorIds = [...new Set([...connectors.map(c => c.id), ...allConnectors.map(c => c.id)])];
      // Use build target as fallback for native detection (Capacitor bridge may be slow)
      const isNative = Capacitor.isNativePlatform() ||
        import.meta.env.VITE_BUILD_TARGET === 'android' ||
        import.meta.env.VITE_BUILD_TARGET === 'ios';
      const platform = Capacitor.getPlatform?.() || import.meta.env.VITE_BUILD_TARGET || 'unknown';

      log('connector_not_found', {
        chosenMethod,
        connectorType,
        connectorIds,
        hasProjectId,
        isNative,
        platform,
        storeSafeMode: Boolean((window as any).__FCZ_STORE_SAFE__),
      });

      if (chosenMethod === 'injected') {
        setErrorMessage('No wallet extension found. Install MetaMask or open this page in a wallet browser.');
      } else if (!hasProjectId) {
        setErrorMessage(
          isNative
            ? 'WalletConnect project ID is missing in this native build. Rebuild the app with VITE_WALLETCONNECT_PROJECT_ID and try again.'
            : 'WalletConnect project ID is missing in this build. Please refresh and try again.'
        );
      } else {
        // FIX (2026-02-12): On native, wagmi connectors are lazily initialized.
        // If we have a project ID but the connector wasn't found, it's likely
        // a timing issue. Tell the user to retry rather than showing a scary
        // technical error.
        setErrorMessage(
          isNative
            ? 'Wallet connector is still initializing. Please tap "Try again" in a moment.'
            : `Wallet connector failed to initialize (found: ${connectorIds.join(', ') || 'none'}). Try closing and reopening the app.`
        );
      }
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
      connect({ connector: connector as any }, {
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
            // WalletConnect frequently emits transient transport errors while
            // switching between browser and wallet app. Keep waiting instead of
            // instantly flipping to hard-fail.
            if (chosenMethod === 'walletconnect' && isTransientWalletConnectError(msg)) {
              setState('awaiting_wallet');
              setErrorMessage('Still waiting for wallet approval…');
              return;
            }
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
        clearConnectTimeout();
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current && stateRef.current !== 'connected' && stateRef.current !== 'idle') {
            // Don't fail while app is backgrounded in wallet app; wait until visible again.
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
              log('timeout_skipped_app_hidden');
              return;
            }
            // If wagmi connected while returning from wallet, finalize success.
            if (accountRef.current.isConnected && accountRef.current.address) {
              log('timeout_resolved_connected_account');
              setState('connected');
              setErrorMessage(null);
              clearConnectTimeout();
              return;
            }
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

    clearConnectTimeout();
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
    clearConnectTimeout();
    detachUriListener();
    setState('idle');
    setMethod(null);
    setWcUri(null);
    setErrorMessage(null);
  }, []);

  // Manage timeout across app background/foreground transitions during WalletConnect.
  useEffect(() => {
    if (method !== 'walletconnect') return;
    if (state !== 'starting' && state !== 'awaiting_wallet') return;
    if (typeof document === 'undefined') return;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        clearConnectTimeout();
        return;
      }
      if (stateRef.current === 'starting' || stateRef.current === 'awaiting_wallet') {
        clearConnectTimeout();
        timeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          if (document.visibilityState === 'hidden') return;
          if (stateRef.current === 'connected' || stateRef.current === 'idle') return;
          if (accountRef.current.isConnected && accountRef.current.address) {
            setState('connected');
            setErrorMessage(null);
            return;
          }
          setState('failed');
          setErrorMessage('Taking too long? Try opening your wallet app, or use the options below.');
        }, WALLET_TIMEOUT_MS);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [method, state]);

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
    diagnostics: {
      connectorIds: [...new Set([...connectors.map(c => c.id), ...allConnectors.map(c => c.id)])],
      hasWalletConnectProjectId: hasWalletConnectProjectId(),
      platform: Capacitor.getPlatform?.() || import.meta.env.VITE_BUILD_TARGET || 'unknown',
      context: browserContext.context,
      inAppName: browserContext.inAppName,
    },
  };
}
