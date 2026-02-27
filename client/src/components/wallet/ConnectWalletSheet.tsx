import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bug, CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { IOS_WALLET_ORDER, type ConnectionMethod, type WalletTarget } from '@/lib/wallet/connectOrchestrator';
import { useWalletConnectionController } from '@/lib/wallet/useWalletConnectionController';
import { hasWalletConnectProjectId } from '@/lib/wallet/walletConfig';

type ConnectWalletSheetProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

function isWalletConnectMethod(method: ConnectionMethod | null): method is 'walletconnect' {
  return method === 'walletconnect';
}

export default function ConnectWalletSheet({ isOpen, onClose }: ConnectWalletSheetProps) {
  const controlled = typeof isOpen === 'boolean';
  const [open, setOpen] = useState(Boolean(isOpen));
  const [showDebug, setShowDebug] = useState(false);
  const [uriCopied, setUriCopied] = useState(false);
  const autoStartedRef = useRef(false);

  const controller = useWalletConnectionController();
  const state = controller.rawState;
  const method = controller.method;
  const browserContext = controller.browserContext;
  const wcUri = controller.wcUri;
  const errorMessage = controller.errorMessage;
  const diagnostics = controller.diagnostics;

  const hasProjectId = hasWalletConnectProjectId();
  const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG_WALLET === 'true';

  const closeSheet = useCallback(() => {
    controller.cancel();
    if (controlled) {
      onClose?.();
      return;
    }
    setOpen(false);
  }, [controller, controlled, onClose]);

  const openWallet = useCallback((wallet: WalletTarget = 'generic') => {
    const deepLink = controller.buildWalletDeepLink(wallet);
    if (!deepLink) {
      toast.error('Connection link is not ready yet.');
      return;
    }

    // Must be triggered directly from user click/tap gesture.
    if (deepLink.startsWith('intent://') || deepLink.startsWith('wc:')) {
      window.location.assign(deepLink);
      return;
    }

    const opened = window.open(deepLink, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(deepLink);
    }
  }, [controller]);

  const copyConnectionLink = useCallback(async () => {
    if (!wcUri) {
      toast.error('Connection link is not ready yet.');
      return;
    }
    try {
      await navigator.clipboard.writeText(wcUri);
      setUriCopied(true);
      window.setTimeout(() => setUriCopied(false), 1800);
      toast.success('Connection link copied');
    } catch {
      toast.error('Could not copy the connection link');
    }
  }, [wcUri]);

  const startPreferred = useCallback(async (preferredMethod?: ConnectionMethod) => {
    try {
      if (preferredMethod) {
        await controller.connectWith(preferredMethod);
      } else {
        await controller.connectPreferred();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to start wallet connection');
    }
  }, [controller]);

  useEffect(() => {
    if (!controlled) return;
    setOpen(Boolean(isOpen));
  }, [controlled, isOpen]);

  useEffect(() => {
    if (controlled) return;
    const handler = () => setOpen(true);
    window.addEventListener('fcz:wallet:connect', handler as EventListener);
    return () => window.removeEventListener('fcz:wallet:connect', handler as EventListener);
  }, [controlled]);

  // Start a single connection attempt per open cycle.
  useEffect(() => {
    if (!open) {
      autoStartedRef.current = false;
      setUriCopied(false);
      return;
    }
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    void startPreferred();
  }, [open, startPreferred]);

  useEffect(() => {
    if (!open) return;
    if (state !== 'connected') return;
    toast.success('Wallet connected');
    const timer = window.setTimeout(() => {
      closeSheet();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [closeSheet, open, state]);

  const title = useMemo(() => {
    if (state === 'connected') return 'Wallet connected';
    if (state === 'failed') return 'Connection failed';
    return 'Connect Wallet';
  }, [state]);

  const subtitle = useMemo(() => {
    if (state === 'failed') return 'Trouble connecting';
    if (state === 'connected') return 'Connection established';
    if (state === 'awaiting_wallet' || state === 'starting') return 'Waiting for wallet approval…';
    return 'Choose your wallet to continue';
  }, [state]);

  const showWalletConnectActions =
    isWalletConnectMethod(method) && (state === 'awaiting_wallet' || state === 'starting' || state === 'failed');

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeSheet();
          return;
        }
        if (controlled) return;
        setOpen(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-modal pointer-events-auto" />
        <Dialog.Content className="z-modal pointer-events-auto fixed inset-x-0 rounded-t-2xl bg-white shadow-xl bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))] focus:outline-none [touch-action:manipulation]">
          <Dialog.Title asChild>
            <VisuallyHidden>Connect wallet</VisuallyHidden>
          </Dialog.Title>
          <Dialog.Description asChild>
            <VisuallyHidden>Connect a crypto wallet to continue</VisuallyHidden>
          </Dialog.Description>

          <div className="mx-auto mt-2 mb-3 h-1.5 w-16 rounded-full bg-gray-200" />

          <div className="px-4 pb-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          </div>

          <div className="overflow-y-auto pb-safe px-4 pt-2">
            {(state === 'starting' || state === 'awaiting_wallet') && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <Loader2 className="w-6 h-6 text-emerald-600 mx-auto animate-spin" />
                <p className="text-sm font-medium text-gray-900 mt-3">Waiting for wallet…</p>
                <p className="text-xs text-gray-600 mt-1">
                  Approve the connection in your wallet app, or use actions below.
                </p>
              </div>
            )}

            {state === 'failed' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Trouble connecting</p>
                    <p className="text-sm mt-0.5">{errorMessage || 'Wallet connection failed.'}</p>
                  </div>
                </div>
              </div>
            )}

            {showWalletConnectActions && (
              <div className="space-y-3 mt-3">
                <button
                  type="button"
                  onClick={() => openWallet('generic')}
                  disabled={!wcUri}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:bg-emerald-300 transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                  Open Wallet App
                </button>

                {browserContext.os === 'ios' && (
                  <div className="grid grid-cols-2 gap-2">
                    {IOS_WALLET_ORDER.map((wallet) => (
                      <button
                        key={wallet}
                        type="button"
                        onClick={() => openWallet(wallet)}
                        disabled={!wcUri}
                        className="h-10 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Open {wallet === 'metamask' ? 'MetaMask' : wallet === 'coinbase' ? 'Coinbase' : wallet === 'trust' ? 'Trust' : 'Rainbow'}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={copyConnectionLink}
                  disabled={!wcUri}
                  className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {uriCopied ? 'Copied!' : 'Copy connection link'}
                </button>
              </div>
            )}

            {(state === 'idle' || (state === 'failed' && !showWalletConnectActions)) && (
              <div className="space-y-3 mt-3">
                <button
                  type="button"
                  onClick={() => void startPreferred()}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
                >
                  <Wallet className="w-5 h-5" />
                  Connect wallet
                </button>

                {browserContext.injectedEthereumAvailable && (
                  <button
                    type="button"
                    onClick={() => void startPreferred('injected')}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Use browser wallet
                  </button>
                )}

                {!hasProjectId && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                    WalletConnect project ID is missing in this build.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 mt-3">
              {(state === 'failed' || state === 'awaiting_wallet' || state === 'starting') && (
                <button
                  type="button"
                  onClick={() => void startPreferred(method ?? undefined)}
                  className="h-10 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Try again
                </button>
              )}
              {(state === 'failed' || state === 'awaiting_wallet' || state === 'starting') && (
                <button
                  type="button"
                  onClick={() => void controller.resetSession()}
                  disabled={controller.isRetrying}
                  className="h-10 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {controller.isRetrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Reset
                </button>
              )}
            </div>

            {debugEnabled && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowDebug(prev => !prev)}
                  className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
                >
                  <Bug className="w-3 h-3" />
                  {showDebug ? 'Hide diagnostics' : 'Wallet diagnostics'}
                </button>
                {showDebug && (
                  <pre className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 text-[11px] text-gray-700 overflow-x-auto">
{JSON.stringify({
  state,
  method,
  hasUri: Boolean(wcUri),
  browserContext,
  diagnostics,
  lastError: errorMessage,
}, null, 2)}
                  </pre>
                )}
              </div>
            )}

            <div className="h-3" />
          </div>

          <Dialog.Close className="absolute right-3 top-2 rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close">
            ✕
          </Dialog.Close>

          {state === 'connected' && (
            <div className="absolute inset-x-4 bottom-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
