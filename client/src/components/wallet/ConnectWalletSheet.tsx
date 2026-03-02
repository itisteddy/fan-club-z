/**
 * ConnectWalletSheet — Wallet-agnostic connection UI
 *
 * FLOW:
 * 1. Sheet opens → wallet options shown immediately
 * 2. User taps a wallet → WalletConnect starts + deep link fires in one gesture
 * 3. OR user taps "Scan QR" → WalletConnect starts + QR shown
 * 4. Wallet in-app browser → single "Connect with [Name]" (injected provider)
 * 5. Desktop + extension → "Browser Wallet" option
 *
 * DESIGN LANGUAGE (matches FiatDepositSheet, AuthGateModal):
 * - × button in header is the ONLY close mechanism (+ backdrop tap)
 * - No redundant "Close" or "Cancel" text buttons
 * - Drag handle on mobile, rounded corners
 *
 * CRITICAL:
 * - showQrModal is FALSE in wagmi config — we own all UI
 * - Deep links use button onClick (Android gesture compliance)
 * - QR rendered client-side with fallback chain
 * - Android: generic wc: scheme triggers OS wallet chooser
 * - iOS: wallet-specific universal links
 */

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import React from 'react';
import { policy as storeSafePolicy } from '@/lib/storeSafePolicy';
import {
  useWalletOrchestrator,
  WALLET_REGISTRY,
  IOS_WALLET_ORDER,
  type WalletTarget,
} from '@/lib/wallet/connectOrchestrator';
import {
  Copy, Check, RefreshCw, ExternalLink, QrCode,
  Monitor, Loader2, AlertCircle, X as XIcon, Wallet,
} from 'lucide-react';

type ConnectWalletSheetProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

// ─── QR Code Image ───────────────────────────────────────────────────────────

function QRCodeImage({ data, size = 200 }: { data: string; size?: number }) {
  const [error, setError] = useState(false);
  const primarySrc = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(data)}&choe=UTF-8`;
  const fallbackSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

  if (error) {
    return (
      <div className="bg-white rounded-lg p-3 border border-gray-200 w-full max-w-[200px]">
        <p className="text-xs text-gray-500 mb-2 text-center">Connection URI:</p>
        <p className="text-[10px] text-gray-700 break-all font-mono leading-relaxed select-all">{data}</p>
      </div>
    );
  }

  return (
    <img
      src={primarySrc}
      alt="Scan to connect wallet"
      width={size}
      height={size}
      className="rounded-lg border border-gray-200 bg-white p-2"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src === primarySrc) {
          img.src = fallbackSrc;
        } else {
          setError(true);
        }
      }}
    />
  );
}

// ─── Wallet Icon ─────────────────────────────────────────────────────────────

function WalletIcon({ wallet, size = 32 }: { wallet: WalletTarget; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const info = WALLET_REGISTRY[wallet];
  if (!info?.iconUrl || imgError) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-blue-100"
        style={{ width: size, height: size }}
      >
        <Wallet className="text-blue-600" style={{ width: size * 0.5, height: size * 0.5 }} />
      </div>
    );
  }
  return (
    <img
      src={info.iconUrl}
      alt={info.label}
      width={size}
      height={size}
      className="rounded-xl"
      onError={() => setImgError(true)}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConnectWalletSheet({ isOpen, onClose }: ConnectWalletSheetProps) {
  const orch = useWalletOrchestrator();
  const [open, setOpen] = useState<boolean>(Boolean(isOpen));
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  // Track which wallet the user selected so we can deep link after URI arrives
  const pendingWalletRef = useRef<WalletTarget | null>(null);

  // ── Controlled / uncontrolled sync ──────────────────────────────────────

  useEffect(() => {
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
    if (typeof isOpen === 'boolean') return;
    const handler = () => {
      if (!storeSafePolicy.allowCryptoWalletConnect) {
        toast('Not available in demo mode.', { id: 'store-safe-wallet' });
        return;
      }
      setOpen(true);
    };
    window.addEventListener('fcz:wallet:connect', handler);
    return () => window.removeEventListener('fcz:wallet:connect', handler);
  }, [isOpen]);

  // Auto-close on successful connection
  useEffect(() => {
    if (orch.state === 'connected' && open) {
      toast.success('Wallet connected!');
      setTimeout(() => handleClose(), 300);
    }
  }, [orch.state, open]);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (open) {
      setShowQR(false);
      setCopied(false);
      pendingWalletRef.current = null;
    } else {
      orch.cancel();
    }
  }, [open]);

  // When URI arrives and we have a pending wallet deep link, fire it
  useEffect(() => {
    if (orch.wcUri && pendingWalletRef.current && orch.state === 'awaiting_wallet') {
      const wallet = pendingWalletRef.current;
      pendingWalletRef.current = null; // Only fire once
      const deepLink = orch.buildWalletDeepLink(wallet);
      if (deepLink) {
        console.log('[ConnectSheet] Auto-opening wallet after URI ready:', wallet);
        window.location.href = deepLink;
      }
    }
  }, [orch.wcUri, orch.state, orch.buildWalletDeepLink]);

  const handleClose = useCallback(() => {
    if (typeof isOpen === 'boolean') {
      if (onClose) onClose();
    } else {
      setOpen(false);
    }
  }, [isOpen, onClose]);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) handleClose();
    else setOpen(true);
  }, [handleClose]);

  const handleCopyUri = useCallback(async () => {
    if (!orch.wcUri) return;
    try {
      await navigator.clipboard.writeText(orch.wcUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = orch.wcUri;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  }, [orch.wcUri]);

  /**
   * User taps a specific wallet.
   * Starts WalletConnect + queues the deep link to fire as soon as URI arrives.
   * The deep link fires from the useEffect above (still within user gesture context
   * because we set pendingWalletRef synchronously here).
   */
  const handleSelectWallet = useCallback((wallet: WalletTarget) => {
    console.log('[ConnectSheet] User selected wallet:', wallet);
    pendingWalletRef.current = wallet;
    orch.startConnect('walletconnect');
  }, [orch.startConnect]);

  /**
   * User taps "Scan QR Code" — starts WalletConnect and shows QR when URI arrives.
   */
  const handleSelectQR = useCallback(() => {
    console.log('[ConnectSheet] User selected QR code');
    pendingWalletRef.current = null;
    setShowQR(true);
    orch.startConnect('walletconnect');
  }, [orch.startConnect]);

  /**
   * Open wallet from the awaiting/failed state (re-trigger deep link).
   */
  const handleOpenWallet = useCallback((wallet: WalletTarget = 'generic') => {
    const deepLink = orch.buildWalletDeepLink(wallet);
    if (!deepLink) {
      toast.error('Connection not ready yet. Please wait a moment.');
      return;
    }
    console.log('[ConnectSheet] Re-opening wallet:', wallet);
    window.location.href = deepLink;
  }, [orch.buildWalletDeepLink]);

  const handleRetry = useCallback(async () => {
    await orch.resetAndRetry();
    // Return to idle — user picks a wallet again
  }, [orch.resetAndRetry]);

  // ── Context ────────────────────────────────────────────────────────────

  const ctx = orch.browserContext;
  const isWalletInApp = ctx.context === 'wallet_inapp';
  const walletName = ctx.inAppName === 'metamask' ? 'MetaMask'
    : ctx.inAppName === 'trust' ? 'Trust Wallet'
    : ctx.inAppName === 'coinbase' ? 'Coinbase Wallet'
    : ctx.inAppName || 'Wallet';

  // ── Wallet Option Renderers ───────────────────────────────────────────

  /** Android: generic "Open Wallet App" triggers OS chooser */
  const renderAndroidWalletOptions = () => (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => handleSelectWallet('generic')}
        className="flex w-full items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
          <Wallet className="w-5 h-5 text-blue-600" />
        </div>
        <div className="text-left flex-1">
          <div className="font-semibold text-gray-900">Open Wallet App</div>
          <div className="text-xs text-gray-500">MetaMask, Trust, Coinbase & more</div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );

  /** iOS: individual wallet buttons (iOS can't do scheme-level chooser) */
  const renderIOSWalletOptions = () => (
    <div className="space-y-2">
      {IOS_WALLET_ORDER.map((w) => {
        const info = WALLET_REGISTRY[w];
        return (
          <button
            key={w}
            type="button"
            onClick={() => handleSelectWallet(w)}
            className="flex w-full items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <WalletIcon wallet={w} size={32} />
            <div className="text-left flex-1">
              <div className="font-semibold text-gray-900">{info.label}</div>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </button>
        );
      })}
    </div>
  );

  /** Desktop: QR option + browser wallet if available */
  const renderDesktopOptions = () => (
    <div className="space-y-2">
      {ctx.injectedEthereumAvailable && (
        <button
          type="button"
          onClick={() => orch.startConnect('injected')}
          className="flex w-full items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100">
            <Monitor className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-left flex-1">
            <div className="font-semibold text-gray-900">Browser Wallet</div>
            <div className="text-xs text-gray-500">MetaMask or compatible extension</div>
          </div>
        </button>
      )}
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 z-modal" />
        <Dialog.Content
          className="z-modal fixed inset-x-0 rounded-t-2xl bg-white shadow-xl bottom-[calc(64px+env(safe-area-inset-bottom,0px))] max-h-[calc(100vh-env(safe-area-inset-top,0px)-64px-env(safe-area-inset-bottom,0px))] focus:outline-none overflow-hidden"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
          data-qa="connect-wallet-sheet"
        >
          <Dialog.Title asChild>
            <VisuallyHidden>Connect wallet</VisuallyHidden>
          </Dialog.Title>
          <Dialog.Description asChild>
            <VisuallyHidden>Select a wallet to connect</VisuallyHidden>
          </Dialog.Description>

          {/* Drag handle */}
          <div className="mx-auto mt-2 mb-3 h-1.5 w-16 rounded-full bg-gray-200" />

          {/* Header — matches FiatDepositSheet pattern */}
          <div className="px-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Connect Wallet</h3>
                <p className="text-sm text-gray-500">
                  {orch.state === 'idle' && 'Select a wallet to connect'}
                  {orch.state === 'starting' && 'Connecting…'}
                  {orch.state === 'awaiting_wallet' && 'Approve in your wallet'}
                  {orch.state === 'connected' && 'Connected!'}
                  {orch.state === 'failed' && 'Connection failed'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 pt-1 pb-4">
            {/* ── IDLE: Wallet selection ── */}
            {orch.state === 'idle' && (
              <div className="space-y-4">
                {/* Wallet in-app: single injected option */}
                {isWalletInApp && ctx.injectedEthereumAvailable && (
                  <button
                    type="button"
                    onClick={() => orch.startConnect('injected')}
                    className="flex w-full items-center gap-3 px-4 py-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 text-white">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Connect with {walletName}</div>
                      <div className="text-xs text-gray-500">Use in-app wallet</div>
                    </div>
                  </button>
                )}

                {/* System browser: wallet options */}
                {!isWalletInApp && (
                  <>
                    {/* Desktop options */}
                    {!ctx.isMobile && renderDesktopOptions()}

                    {/* Mobile: platform-specific wallet options */}
                    {ctx.isMobile && ctx.os === 'android' && renderAndroidWalletOptions()}
                    {ctx.isMobile && ctx.os === 'ios' && renderIOSWalletOptions()}

                    {/* QR Code option — all platforms */}
                    <button
                      type="button"
                      onClick={handleSelectQR}
                      className="flex w-full items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100">
                        <QrCode className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="text-left flex-1">
                        <div className="font-semibold text-gray-900">Scan QR Code</div>
                        <div className="text-xs text-gray-500">Connect with any wallet app</div>
                      </div>
                    </button>

                    {/* Copy link — always available as tertiary */}
                    <button
                      type="button"
                      onClick={() => {
                        // Start a WC connection just to get the URI for copying
                        pendingWalletRef.current = null;
                        orch.startConnect('walletconnect');
                        // The copy will be available once URI arrives
                        toast('Starting connection… You can copy the link once ready.');
                      }}
                      className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy connection link
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── STARTING: Spinner ── */}
            {orch.state === 'starting' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm text-gray-600">Connecting…</p>
              </div>
            )}

            {/* ── AWAITING: Injected provider ── */}
            {orch.state === 'awaiting_wallet' && orch.method === 'injected' && (
              <div className="flex flex-col items-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
                  <Wallet className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Approve in your wallet</p>
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Check your {isWalletInApp ? walletName : 'browser wallet'} for a connection request.
                </p>
              </div>
            )}

            {/* ── AWAITING: WalletConnect (deep link fired or QR shown) ── */}
            {orch.state === 'awaiting_wallet' && orch.method === 'walletconnect' && (
              <div className="space-y-4">
                {/* QR code — shown if user chose QR, or always on desktop */}
                {(showQR || !ctx.isMobile) && orch.wcUri && (
                  <div className="flex flex-col items-center py-4 px-2 rounded-xl bg-gray-50 border border-gray-100">
                    <QRCodeImage data={orch.wcUri} />
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Scan with any WalletConnect-compatible wallet
                    </p>
                  </div>
                )}

                {/* Waiting spinner — shown on mobile when deep link was fired (not QR) */}
                {!showQR && ctx.isMobile && (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-gray-900">Waiting for approval…</p>
                    <p className="text-xs text-gray-500 text-center mt-1 max-w-xs">
                      Approve the connection in your wallet app.
                    </p>
                  </div>
                )}

                {/* Secondary actions */}
                <div className="space-y-2">
                  {/* Re-open wallet (mobile only, deep link mode) */}
                  {ctx.isMobile && !showQR && orch.wcUri && (
                    <button
                      type="button"
                      onClick={() => handleOpenWallet(ctx.os === 'android' ? 'generic' : 'metamask')}
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open wallet again
                    </button>
                  )}

                  {/* Toggle QR (mobile only) */}
                  {ctx.isMobile && (
                    <button
                      type="button"
                      onClick={() => setShowQR(v => !v)}
                      disabled={!orch.wcUri}
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      {showQR ? 'Hide QR code' : 'Show QR code'}
                    </button>
                  )}

                  {/* Copy link */}
                  <button
                    type="button"
                    onClick={handleCopyUri}
                    disabled={!orch.wcUri}
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {copied ? (
                      <><Check className="w-4 h-4 text-emerald-500" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy connection link</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── CONNECTED ── */}
            {orch.state === 'connected' && (
              <div className="flex flex-col items-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Wallet connected!</p>
              </div>
            )}

            {/* ── FAILED: Recovery ── */}
            {orch.state === 'failed' && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Trouble connecting</p>
                    <p className="text-xs text-amber-600 mt-0.5">{orch.errorMessage || 'Something went wrong.'}</p>
                  </div>
                </div>

                {/* Retry — resets to idle so user can pick a wallet again */}
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={orch.isRetrying}
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-wait transition-colors"
                >
                  {orch.isRetrying ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Cleaning up…</>
                  ) : (
                    <><RefreshCw className="w-5 h-5" /> Try again</>
                  )}
                </button>

                {/* Re-open wallet (if URI still valid) */}
                {orch.wcUri && ctx.isMobile && (
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    onClick={() => handleOpenWallet(ctx.os === 'android' ? 'generic' : 'metamask')}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open wallet again
                  </button>
                )}

                {/* Copy / QR fallbacks */}
                {orch.wcUri && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleCopyUri}
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      {copied ? (
                        <><Check className="w-4 h-4 text-emerald-500" /> Copied!</>
                      ) : (
                        <><Copy className="w-4 h-4" /> Copy connection link</>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQR(v => !v)}
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      <QrCode className="w-4 h-4" />
                      {showQR ? 'Hide QR code' : 'Show QR code'}
                    </button>
                    {showQR && (
                      <div className="flex flex-col items-center py-4 px-2 rounded-xl bg-gray-50 border border-gray-100">
                        <QRCodeImage data={orch.wcUri} />
                        <p className="text-xs text-gray-500 mt-3 text-center">Scan with any wallet app</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
