/**
 * ConnectWalletSheet — Context-aware, wallet-agnostic connection UI
 *
 * Uses the Orchestrator state machine to provide reliable wallet connections
 * across all browser contexts:
 *
 * - Wallet in-app browser → injected provider (no WalletConnect)
 * - Android Chrome → WalletConnect with OS app chooser (wc: scheme, any wallet)
 * - iOS Safari → WalletConnect with wallet picker (MetaMask, Trust, Coinbase, Rainbow)
 * - Desktop → injected (extension) or WalletConnect QR (scan from any wallet)
 *
 * CRITICAL DESIGN DECISIONS:
 * - showQrModal is FALSE in wagmi config — we own all UI here
 * - Deep links use button onClick (NOT <a href>) for Android gesture compliance
 * - QR codes rendered with fallback chain (no single API dependency)
 * - Android: generic wc: deep link triggers OS wallet chooser — NOT locked to MetaMask
 * - iOS: wallet picker with universal links for top wallets
 * - Desktop: QR auto-shown (primary use case is scan from phone)
 * - Timeout shows recovery options but doesn't kill the connection
 */

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import React from 'react';
import { policy as storeSafePolicy } from '@/lib/storeSafePolicy';
import {
  useWalletOrchestrator,
  WALLET_REGISTRY,
  IOS_WALLET_ORDER,
  type ConnectionMethod,
  type WalletTarget,
} from '@/lib/wallet/connectOrchestrator';
import {
  Copy, Check, RefreshCw, ExternalLink, Smartphone, QrCode,
  Monitor, Loader2, AlertCircle, X as XIcon, Wallet, ChevronDown,
} from 'lucide-react';

type ConnectWalletSheetProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

// ─── Inline QR Code Image ────────────────────────────────────────────────────

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

function WalletIcon({ wallet, size = 28 }: { wallet: WalletTarget; size?: number }) {
  const info = WALLET_REGISTRY[wallet];
  if (!info?.iconUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-blue-100"
        style={{ width: size, height: size }}
      >
        <Wallet className="text-blue-600" style={{ width: size * 0.55, height: size * 0.55 }} />
      </div>
    );
  }
  return (
    <img
      src={info.iconUrl}
      alt={info.label}
      width={size}
      height={size}
      className="rounded-lg"
      onError={(e) => {
        // Fallback to generic icon
        e.currentTarget.style.display = 'none';
      }}
    />
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConnectWalletSheet({ isOpen, onClose }: ConnectWalletSheetProps) {
  const orch = useWalletOrchestrator();
  const [open, setOpen] = useState<boolean>(Boolean(isOpen));
  const [showQR, setShowQR] = useState(false);
  const [showMoreWallets, setShowMoreWallets] = useState(false);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    if (orch.state === 'connected' && open) {
      toast.success('Wallet connected!');
      setTimeout(() => handleClose(), 300);
    }
  }, [orch.state, open]);

  useEffect(() => {
    if (open) {
      setShowQR(false);
      setShowMoreWallets(false);
      setCopied(false);
    } else {
      orch.cancel();
    }
  }, [open]);

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
   * Open a wallet via deep link.
   * CRITICAL: Must be called from button onClick (user gesture for Android).
   */
  const handleOpenWallet = useCallback((wallet: WalletTarget = 'generic') => {
    const deepLink = orch.buildWalletDeepLink(wallet);
    if (!deepLink) {
      toast.error('Connection not ready yet. Please wait a moment.');
      return;
    }
    const info = WALLET_REGISTRY[wallet];
    console.log('[ConnectSheet] Opening wallet deep link:', wallet, info?.label);
    window.location.href = deepLink;
  }, [orch.buildWalletDeepLink]);

  const handleRetry = useCallback(async () => {
    const prevMethod = orch.method;
    await orch.resetAndRetry();
    orch.startConnect(prevMethod || undefined);
  }, [orch.method, orch.resetAndRetry, orch.startConnect]);

  // ── Context ────────────────────────────────────────────────────────────

  const ctx = orch.browserContext;
  const isWalletInApp = ctx.context === 'wallet_inapp';
  const walletName = ctx.inAppName === 'metamask' ? 'MetaMask'
    : ctx.inAppName === 'trust' ? 'Trust Wallet'
    : ctx.inAppName === 'coinbase' ? 'Coinbase Wallet'
    : ctx.inAppName || 'Wallet';

  // Desktop: QR auto-shown when URI is ready
  const shouldAutoShowQR = !ctx.isMobile && orch.wcUri;
  const qrVisible = showQR || !!shouldAutoShowQR;

  // ── Wallet Deep Link Buttons ──────────────────────────────────────────

  /** Render the primary "Open Wallet" CTA for mobile */
  const renderMobileWalletCTA = () => {
    if (!orch.wcUri || !ctx.isMobile) return null;

    if (ctx.os === 'android') {
      // Android: single "Open Wallet App" button that triggers OS chooser
      return (
        <button
          type="button"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
          onClick={() => handleOpenWallet('generic')}
        >
          <ExternalLink className="w-5 h-5" />
          Open Wallet App
        </button>
      );
    }

    // iOS: show wallet picker since iOS can't do scheme-level app chooser
    return (
      <div className="space-y-2">
        {/* Top wallets as individual buttons */}
        {IOS_WALLET_ORDER.slice(0, 2).map((w) => {
          const info = WALLET_REGISTRY[w];
          return (
            <button
              key={w}
              type="button"
              className="flex items-center gap-3 w-full h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              onClick={() => handleOpenWallet(w)}
            >
              <WalletIcon wallet={w} size={28} />
              <span className="font-medium text-gray-900">{info.label}</span>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
          );
        })}

        {/* "More wallets" expandable */}
        {!showMoreWallets && (
          <button
            type="button"
            onClick={() => setShowMoreWallets(true)}
            className="flex items-center justify-center gap-1 w-full h-10 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            More wallets
            <ChevronDown className="w-4 h-4" />
          </button>
        )}
        {showMoreWallets && IOS_WALLET_ORDER.slice(2).map((w) => {
          const info = WALLET_REGISTRY[w];
          return (
            <button
              key={w}
              type="button"
              className="flex items-center gap-3 w-full h-12 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              onClick={() => handleOpenWallet(w)}
            >
              <WalletIcon wallet={w} size={28} />
              <span className="font-medium text-gray-900">{info.label}</span>
              <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
          );
        })}
      </div>
    );
  };

  /** Render wallet options in the failed/recovery state */
  const renderRecoveryWalletButtons = () => {
    if (!orch.wcUri || !ctx.isMobile) return null;

    if (ctx.os === 'android') {
      return (
        <button
          type="button"
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          onClick={() => handleOpenWallet('generic')}
        >
          <ExternalLink className="w-4 h-4" />
          Open Wallet App
        </button>
      );
    }

    // iOS: compact wallet row
    return (
      <div className="flex items-center justify-center gap-3 py-2">
        {IOS_WALLET_ORDER.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => handleOpenWallet(w)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors"
            title={WALLET_REGISTRY[w].label}
          >
            <WalletIcon wallet={w} size={36} />
            <span className="text-[10px] text-gray-500">{WALLET_REGISTRY[w].shortLabel}</span>
          </button>
        ))}
      </div>
    );
  };

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
            <VisuallyHidden>Select a wallet provider</VisuallyHidden>
          </Dialog.Description>

          {/* Drag handle */}
          <div className="mx-auto mt-2 mb-3 h-1.5 w-16 rounded-full bg-gray-200" />

          {/* Header */}
          <div className="px-4 pb-3 flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connect Wallet</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {orch.state === 'idle' && 'Choose how to connect your wallet.'}
                {orch.state === 'starting' && 'Preparing connection…'}
                {orch.state === 'awaiting_wallet' && 'Waiting for wallet approval…'}
                {orch.state === 'connected' && 'Connected!'}
                {orch.state === 'failed' && 'Trouble connecting'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 -mt-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-4 pt-1 pb-4">
            {/* ── IDLE: Show connection options ── */}
            {orch.state === 'idle' && (
              <div className="space-y-2">
                {/* Wallet in-app: only injected */}
                {isWalletInApp && ctx.injectedEthereumAvailable && (
                  <button
                    type="button"
                    onClick={() => orch.startConnect('injected')}
                    className="flex w-full items-center gap-3 px-4 py-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500 text-white">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900">Connect with {walletName}</div>
                      <div className="text-xs text-gray-500">Use in-app wallet (recommended)</div>
                    </div>
                  </button>
                )}

                {/* System browser */}
                {!isWalletInApp && (
                  <>
                    {/* Desktop: injected (extension) */}
                    {!ctx.isMobile && ctx.injectedEthereumAvailable && (
                      <button
                        type="button"
                        onClick={() => orch.startConnect('injected')}
                        className="flex w-full items-center gap-3 px-4 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100">
                          <Monitor className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">Browser Wallet</div>
                          <div className="text-xs text-gray-500">MetaMask or compatible extension</div>
                        </div>
                      </button>
                    )}

                    {/* WalletConnect */}
                    <button
                      type="button"
                      onClick={() => orch.startConnect('walletconnect')}
                      className="flex w-full items-center gap-3 px-4 py-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">
                          {ctx.isMobile ? 'Mobile Wallet' : 'WalletConnect'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {ctx.isMobile
                            ? 'MetaMask, Trust Wallet, Coinbase & more'
                            : 'Scan QR code with any wallet app'}
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── STARTING ── */}
            {orch.state === 'starting' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm text-gray-600">Preparing connection…</p>
              </div>
            )}

            {/* ── AWAITING: Injected ── */}
            {orch.state === 'awaiting_wallet' && orch.method === 'injected' && (
              <div className="flex flex-col items-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
                  <Wallet className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">Approve in your wallet</p>
                <p className="text-xs text-gray-500 text-center max-w-xs">
                  Check your {isWalletInApp ? walletName : 'browser wallet'} for a connection request.
                </p>
                <button
                  type="button"
                  onClick={() => orch.cancel()}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ── AWAITING: WalletConnect ── */}
            {orch.state === 'awaiting_wallet' && orch.method === 'walletconnect' && (
              <div className="space-y-3">
                {/* QR Code — auto on desktop, toggle on mobile */}
                {qrVisible && orch.wcUri && (
                  <div className="flex flex-col items-center py-4 px-2 rounded-xl bg-gray-50 border border-gray-100">
                    <QRCodeImage data={orch.wcUri} />
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Scan with any WalletConnect-compatible wallet
                    </p>
                  </div>
                )}

                {!qrVisible && (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-gray-900">Waiting for wallet…</p>
                    <p className="text-xs text-gray-500 text-center mt-1 max-w-xs">
                      Approve the connection in your wallet app, or choose a wallet below.
                    </p>
                  </div>
                )}

                {/* Wallet deep link CTA(s) */}
                <div className="space-y-2">
                  {renderMobileWalletCTA()}

                  {/* QR toggle — mobile only (desktop auto-shows) */}
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

                  <button
                    type="button"
                    onClick={() => orch.cancel()}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                  >
                    Cancel
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
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Trouble connecting</p>
                    <p className="text-xs text-amber-600 mt-0.5">{orch.errorMessage || 'Something went wrong.'}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {/* Retry */}
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

                  {/* Wallet deep link options */}
                  {renderRecoveryWalletButtons()}

                  {/* Copy link */}
                  {orch.wcUri && (
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
                  )}

                  {/* QR */}
                  {orch.wcUri && (
                    <>
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
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
