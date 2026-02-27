import { useMemo } from 'react';
import { useDisconnect } from 'wagmi';
import {
  type ConnectionMethod,
  useWalletOrchestrator,
  type WalletTarget,
  type OrchestratorState,
} from '@/lib/wallet/connectOrchestrator';
import type { BrowserContextInfo } from '@/lib/browserContext';

export type WalletConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WalletConnectionController {
  state: WalletConnectionState;
  rawState: OrchestratorState;
  method: ConnectionMethod | null;
  browserContext: BrowserContextInfo;
  wcUri: string | null;
  errorMessage: string | null;
  connectPreferred: () => Promise<void>;
  connectWith: (connector: ConnectionMethod) => Promise<void>;
  disconnect: () => Promise<void>;
  resetSession: () => Promise<void>;
  cancel: () => void;
  buildWalletDeepLink: (wallet?: WalletTarget) => string | null;
  isRetrying: boolean;
  diagnostics: {
    providerType: 'injected' | 'walletconnect' | 'unknown';
    isMobile: boolean;
    isNativeApp: boolean;
    context: string;
    inAppName: string | null;
    connectorIds: string[];
    hasWalletConnectProjectId: boolean;
    platform: string;
  };
}

function mapState(state: OrchestratorState): WalletConnectionState {
  if (state === 'connected') return 'connected';
  if (state === 'failed') return 'error';
  if (state === 'starting' || state === 'awaiting_wallet') return 'connecting';
  return 'disconnected';
}

export function useWalletConnectionController(): WalletConnectionController {
  const orchestrator = useWalletOrchestrator();
  const { disconnectAsync } = useDisconnect();

  const providerType: 'injected' | 'walletconnect' | 'unknown' =
    orchestrator.method === 'injected'
      ? 'injected'
      : orchestrator.method === 'walletconnect'
      ? 'walletconnect'
      : 'unknown';

  return useMemo(
    () => ({
      state: mapState(orchestrator.state),
      rawState: orchestrator.state,
      method: orchestrator.method,
      browserContext: orchestrator.browserContext,
      wcUri: orchestrator.wcUri,
      errorMessage: orchestrator.errorMessage,
      connectPreferred: () => orchestrator.startConnect(),
      connectWith: (connector: ConnectionMethod) => orchestrator.startConnect(connector),
      disconnect: async () => {
        orchestrator.cancel();
        await disconnectAsync().catch(() => undefined);
      },
      resetSession: () => orchestrator.resetAndRetry(),
      cancel: orchestrator.cancel,
      buildWalletDeepLink: orchestrator.buildWalletDeepLink,
      isRetrying: orchestrator.isRetrying,
      diagnostics: {
        providerType,
        isMobile: orchestrator.browserContext.isMobile,
        isNativeApp: orchestrator.browserContext.context === 'system_browser' && orchestrator.diagnostics.platform !== 'web',
        context: orchestrator.browserContext.context,
        inAppName: orchestrator.browserContext.inAppName,
        connectorIds: orchestrator.diagnostics.connectorIds,
        hasWalletConnectProjectId: orchestrator.diagnostics.hasWalletConnectProjectId,
        platform: orchestrator.diagnostics.platform,
      },
    }),
    [disconnectAsync, orchestrator, providerType]
  );
}
