import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState, useCallback } from 'react';
import { useConnect } from 'wagmi';
import toast from 'react-hot-toast';

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
  const [connecting, setConnecting] = useState(false);
  const isMobile = isMobileDevice();
  const wcConnector = wcEnabled ? connectors.find(c => c.id === 'walletConnect') : null;

  const handleConnect = useCallback(async (connector: any) => {
    if (connecting) return; // Prevent multiple simultaneous connection attempts
    
    setConnecting(true);
    const connectTimeout = 20000; // 20 seconds timeout
    let timeoutFired = false;
    const timeoutId = setTimeout(() => {
      timeoutFired = true;
      setConnecting(false);
      toast.error('Connection timeout. Please try again or check your network connection.');
      console.error('[WalletConnect] Connection timeout after', connectTimeout, 'ms');
    }, connectTimeout);

    try {
      await connect({ connector });
      clearTimeout(timeoutId);
      if (!timeoutFired) {
        setConnecting(false);
        if (onClose) onClose();
        else setOpen(false);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (!timeoutFired) {
        setConnecting(false);
      }
      const errorMessage = err?.message || 'Failed to connect wallet';
      
      // Provide helpful error messages
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        toast.error('WalletConnect configuration error. Please contact support.');
        console.error('[WalletConnect] 403 Forbidden - Domain may not be whitelisted at cloud.reown.com');
      } else if (errorMessage.includes('User rejected')) {
        toast.error('Connection cancelled');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        toast.error('Connection timeout. Please try again.');
      } else {
        toast.error(errorMessage);
      }
    }
  }, [connect, onClose, connecting]);

  // On mobile, auto-connect WalletConnect when modal opens
  useEffect(() => {
    if (isMobile && open && wcConnector && wcEnabled) {
      // Auto-connect WalletConnect on mobile without showing modal
      handleConnect(wcConnector);
    }
  }, [isMobile, open, wcConnector, wcEnabled, handleConnect]);

  useEffect(() => {
    // Controlled mode sync
    if (typeof isOpen === 'boolean') {
      setOpen(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    // Uncontrolled (global event) mode only when isOpen prop is not provided
    if (typeof isOpen === 'boolean') return;
    const handler = () => {
      // On mobile, directly connect WalletConnect without showing modal
      if (isMobile && wcConnector && wcEnabled) {
        handleConnect(wcConnector);
      } else {
        setOpen(true);
      }
    };
    window.addEventListener('fcz:wallet:connect', handler as EventListener);
    return () => window.removeEventListener('fcz:wallet:connect', handler as EventListener);
  }, [isOpen, isMobile, wcConnector, wcEnabled, handleConnect]);

  const browserConnector = connectors.find(c => c.id === 'injected');

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (typeof isOpen === 'boolean') {
          if (!next && onClose) onClose();
        } else {
          setOpen(next);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-modal" />
        <Dialog.Content
          className="z-modal fixed inset-x-0 rounded-t-2xl bg-white shadow-xl bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))] focus:outline-none"
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
            <p className="text-sm text-gray-500">Choose a wallet provider to continue.</p>
          </div>

          <div className="overflow-y-auto pb-safe px-4 pt-3">
            {isMobile ? (
              // On mobile, only show WalletConnect option
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <button
                  type="button"
                  disabled={!wcConnector || !wcEnabled || connecting}
                  onClick={() => wcConnector && handleConnect(wcConnector)}
                  className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-50 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🪢</span>
                    <div>
                      <div className="font-medium">WalletConnect</div>
                      <div className="text-xs text-gray-500">
                        {connecting ? 'Connecting...' : 'Connect your mobile wallet'}
                        {!wcEnabled && !connecting && (
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
                    disabled={!browserConnector}
                    onClick={() => browserConnector && handleConnect(browserConnector)}
                    className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-50 disabled:opacity-50"
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
                    disabled={!wcConnector || !wcEnabled || connecting}
                    onClick={() => wcConnector && handleConnect(wcConnector)}
                    className="flex w-full items-center justify-between px-4 py-4 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🪢</span>
                      <div>
                        <div className="font-medium">WalletConnect</div>
                        <div className="text-xs text-gray-500">
                          {connecting ? 'Connecting...' : 'Mobile wallets (QR / deep link)'}
                          {!wcEnabled && !connecting && (
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

            {status === 'error' && (
              <p className="px-4 pt-3 text-xs text-red-600">{String(error?.message ?? 'Failed to connect')}</p>
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

