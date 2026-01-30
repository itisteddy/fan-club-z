import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useConnect } from 'wagmi';
import toast from 'react-hot-toast';
import { policy as storeSafePolicy } from '@/lib/storeSafePolicy';
import { isFeatureEnabled } from '@/config/featureFlags';

const WC_ID = import.meta.env.VITE_WC_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
const wcEnabled = WC_ID.length >= 8;

// Detect mobile device
const isMobileDevice = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768 && 'ontouchstart' in window);
};

type ConnectWalletSheetProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

export default function ConnectWalletSheet({ isOpen, onClose }: ConnectWalletSheetProps) {
  const { connect, connectors, status, error } = useConnect();
  const [open, setOpen] = useState<boolean>(Boolean(isOpen));
  const [connectError, setConnectError] = useState<string | null>(null);
  const isMobile = isMobileDevice();
  const wcConnector = wcEnabled ? connectors.find(c => c.id === 'walletConnect') : null;
  
  // Guard to prevent repeated connect attempts
  const attemptedRef = useRef(false);
  const lastAttemptRef = useRef<number>(0);

  const walletConnectV2Enabled = isFeatureEnabled('WALLET_CONNECT_V2');
  const isPending = walletConnectV2Enabled && status === 'pending';

  // Reset attempt guard and error when sheet opens
  useEffect(() => {
    if (open) {
      attemptedRef.current = false;
      setConnectError(null);
    }
  }, [open]);

  // When user closes sheet while pending, allow retry next time (no stuck state)
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (walletConnectV2Enabled && !next && isPending) {
        attemptedRef.current = false;
        toast('Connection cancelled. You can try again anytime.');
      }
      if (typeof isOpen === 'boolean') {
        if (!next && onClose) onClose();
      } else {
        setOpen(next);
      }
    },
    [isOpen, onClose, isPending, walletConnectV2Enabled]
  );

  const handleConnect = useCallback(async (connector: any) => {
    // Prevent repeated attempts within 10 seconds
    const now = Date.now();
    if (attemptedRef.current && (now - lastAttemptRef.current) < 10000) {
      return;
    }
    
    attemptedRef.current = true;
    lastAttemptRef.current = now;
    setConnectError(null);
    
    try {
      await connect({ connector });
      if (onClose) onClose();
      else setOpen(false);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to connect wallet';
      setConnectError(errorMessage);
      
      // Provide helpful error messages
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('WalletConnect configuration error. Please contact support.');
        console.error('[WalletConnect] 403 Forbidden - Domain may not be whitelisted at cloud.reown.com');
      } else if (errorMessage.includes('User rejected')) {
        toast.error('Connection cancelled');
      } else {
        toast.error(errorMessage);
      }
      
      // Reset attempt flag so user can try again
      attemptedRef.current = false;
    }
  }, [connect, onClose]);

  useEffect(() => {
    // Controlled mode sync
    if (typeof isOpen === 'boolean') {
      if (!storeSafePolicy.allowCryptoWalletConnect && isOpen) {
        toast('Not available in demo mode.', { id: 'store-safe-wallet' });
        if (onClose) onClose();
        setOpen(false);
        return;
      }
      setOpen(isOpen);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    // Uncontrolled (global event) mode only when isOpen prop is not provided
    if (typeof isOpen === 'boolean') return;
    const handler = () => {
      if (!storeSafePolicy.allowCryptoWalletConnect) {
        toast('Not available in demo mode.', { id: 'store-safe-wallet' });
        return;
      }
      // On mobile, show the sheet (no auto-connect)
      setOpen(true);
    };
    window.addEventListener('fcz:wallet:connect', handler as EventListener);
    return () => window.removeEventListener('fcz:wallet:connect', handler as EventListener);
  }, [isOpen]);

  const browserConnector = connectors.find(c => c.id === 'injected');

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-modal" />
        <Dialog.Content
          className="z-modal fixed inset-x-0 rounded-t-2xl bg-white shadow-xl bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))] focus:outline-none"
          data-qa="connect-wallet-sheet"
        >
          <Dialog.Title asChild>
            <VisuallyHidden>Connect wallet</VisuallyHidden>
          </Dialog.Title>
          <Dialog.Description asChild>
            <VisuallyHidden>Select a wallet provider</VisuallyHidden>
          </Dialog.Description>

          <div className="mx-auto mt-2 mb-3 h-1.5 w-16 rounded-full bg-gray-200" />
          <div className="px-4 pb-3">
            <h3 className="text-lg font-semibold">Connect wallet</h3>
            <p className="text-sm text-gray-500">
              {walletConnectV2Enabled && isPending
                ? 'Approve in your wallet or cancel below.'
                : 'Choose a wallet provider to continue.'}
            </p>
          </div>

          <div className="overflow-y-auto pb-safe px-4 pt-3">
            {walletConnectV2Enabled && isPending && (
              <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                  Connecting…
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-800 underline"
                >
                  Cancel
                </button>
              </div>
            )}
            {isMobile ? (
              // On mobile, only show WalletConnect option
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  disabled={!wcConnector || !wcEnabled || isPending}
                  onClick={() => wcConnector && handleConnect(wcConnector)}
                  className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🪢</span>
                    <div>
                      <div className="font-medium">WalletConnect</div>
                      <div className="text-xs text-gray-500">
                        Connect your mobile wallet
                        {!wcEnabled && (
                          <span className="ml-2 text-xs text-gray-500">(add VITE_WC_PROJECT_ID)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-gray-400">›</span>
                </button>
              </div>
            ) : (
              // On desktop, show both options
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                <li>
                  <button
                    type="button"
                    disabled={!browserConnector || isPending}
                    onClick={() => browserConnector && handleConnect(browserConnector)}
                    className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🦊</span>
                      <div>
                        <div className="font-medium">Browser Wallet</div>
                        <div className="text-xs text-gray-500">MetaMask or compatible</div>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    disabled={!wcConnector || !wcEnabled || isPending}
                    onClick={() => wcConnector && handleConnect(wcConnector)}
                    className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🪢</span>
                      <div>
                        <div className="font-medium">WalletConnect</div>
                        <div className="text-xs text-gray-500">
                          Mobile wallets (QR / deep link)
                          {!wcEnabled && (
                            <span className="ml-2 text-xs text-gray-500">(add VITE_WC_PROJECT_ID)</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-400">›</span>
                  </button>
                </li>
              </ul>
            )}

            {(status === 'error' || connectError) && (
              <div className="px-4 pt-3 space-y-2">
                <p className="text-xs text-red-600">
                  {connectError || String(error?.message ?? 'Failed to connect')}
                </p>
                {connectError && (
                  <button
                    type="button"
                    onClick={() => {
                      attemptedRef.current = false;
                      setConnectError(null);
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            <div className="h-3" />
          </div>

          <Dialog.Close className="absolute right-3 top-2 rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close">
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

