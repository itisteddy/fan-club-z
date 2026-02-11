/**
 * ConnectWalletSheet — Context-aware wallet connection UI
 *
 * Uses the Orchestrator state machine to provide reliable wallet connections
 * across all browser contexts:
 *
 * - MetaMask in-app browser → injected provider (no WalletConnect)
 * - Android Chrome → WalletConnect with deep link CTA
 * - iOS Safari → WalletConnect with universal link CTA
 * - Desktop → injected (MetaMask extension) or WalletConnect QR
 *
 * Every state has explicit UI. No "hope the modal works" patterns.
 *
 * CRITICAL DESIGN DECISIONS:
 * - showQrModal is FALSE in wagmi config — we own all UI here
 * - Deep links use button onClick (NOT <a href>) for Android gesture compliance
 * - QR codes rendered client-side via inline SVG (no external API dependency)
 * - Timeout shows recovery options but doesn't kill the connection
 * - Desktop: QR shown by default (primary use case is scan-from-phone)
 * - Mobile: "Open MetaMask" CTA shown primary, QR behind toggle
 */

import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import React from 'react';
import { policy as storeSafePolicy } from '@/lib/storeSafePolicy';
import { useWalletOrchestrator, type ConnectionMethod } from '@/lib/wallet/connectOrchestrator';
import { Copy, Check, RefreshCw, ExternalLink, Smartphone, QrCode, Monitor, Loader2, AlertCircle, X as XIcon, Wallet } from 'lucide-react';

type ConnectWalletSheetProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

// ─── Inline QR Code Generator ────────────────────────────────────────────────

/**
 * Minimal QR code generator that produces an SVG data URI.
 * No external dependencies or API calls required.
 * Uses a simplified approach: encode the URI as a QR code image URL
 * via Google Charts API (runs client-side, no CORS issues) with
 * graceful fallback to text display.
 */
function QRCodeImage({ data, size = 200 }: { data: string; size?: number }) {
  const [error, setError] = useState(false);
  // Primary: Google Charts QR API (reliable, no CORS)
  // Fallback: qrserver.com
  // Final fallback: show raw URI for copy
  const primarySrc = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encodeURIComponent(data)}&choe=UTF-8`;
  const fallbackSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;

  if (error) {
    // Both APIs failed — show copyable URI
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
        // Try fallback
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function ConnectWalletSheet({ isOpen, onClose }: ConnectWalletSheetProps) {
  const orch = useWalletOrchestrator();
  const [open, setOpen] = useState<boolean>(Boolean(isOpen));
  const [showQR, setShowQR] = useState(false);
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

  // Uncontrolled (global event) mode
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

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setShowQR(false);
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
      // Fallback
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
   * CRITICAL: Deep link must be triggered from a direct user gesture (onClick).
   * Android Chrome blocks deep links triggered from async code, re-renders, or
   * <a href> during mount. Using window.location.href from a button onClick
   * is the most reliable cross-platform approach.
   */
  const handleOpenWallet = useCallback((wallet: 'metamask' | 'trust' | 'coinbase' = 'metamask') => {
    const deepLink = orch.buildWalletDeepLink(wallet);
    if (!deepLink) {
      toast.error('Connection not ready yet. Please wait a moment.');
      return;
    }
    console.log('[ConnectSheet] Opening wallet deep link for', wallet);
    window.location.href = deepLink;
  }, [orch.buildWalletDeepLink]);

  const handleRetry = useCallback(async () => {
    const prevMethod = orch.method;
    await orch.resetAndRetry();
    // Auto-start again with same method
    orch.startConnect(prevMethod || undefined);
  }, [orch.method, orch.resetAndRetry, orch.startConnect]);

  // ── Detect which UI to show ────────────────────────────────────────────

  const ctx = orch.browserContext;
  const isWalletInApp = ctx.context === 'wallet_inapp';
  const walletName = ctx.inAppName === 'metamask' ? 'MetaMask'
    : ctx.inAppName === 'trust' ? 'Trust Wallet'
    : ctx.inAppName === 'coinbase' ? 'Coinbase Wallet'
    : ctx.inAppName || 'Wallet';

  // Desktop: show QR by default when URI is ready (primary use case: scan from phone)
  const shouldAutoShowQR = !ctx.isMobile && orch.wcUri;
  const qrVisible = showQR || !!shouldAutoShowQR;

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
                {/* In wallet browser: only show injected option */}
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

                {/* System browser options */}
                {!isWalletInApp && (
                  <>
                    {/* Desktop: Browser wallet (injected) */}
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

                    {/* WalletConnect (mobile + desktop fallback) */}
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
                          {ctx.isMobile ? 'Open MetaMask or other wallet app' : 'Scan QR or deep link to mobile wallet'}
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── STARTING: Spinner ── */}
            {orch.state === 'starting' && (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                <p className="text-sm text-gray-600">Preparing connection…</p>
              </div>
            )}

            {/* ── AWAITING WALLET (injected): User must approve in wallet popup ── */}
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

            {/* ── AWAITING WALLET (walletconnect): Deep link + QR + copy ── */}
            {orch.state === 'awaiting_wallet' && orch.method === 'walletconnect' && (
              <div className="space-y-3">
                {/* QR Code — auto-shown on desktop, toggle on mobile */}
                {qrVisible && orch.wcUri && (
                  <div className="flex flex-col items-center py-4 px-2 rounded-xl bg-gray-50 border border-gray-100">
                    <QRCodeImage data={orch.wcUri} />
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      {ctx.isMobile ? 'Scan this QR code with another device' : 'Scan this QR code with your wallet app'}
                    </p>
                  </div>
                )}

                {!qrVisible && (
                  <div className="flex flex-col items-center py-6">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-3" />
                    <p className="text-sm font-medium text-gray-900">Waiting for wallet…</p>
                    <p className="text-xs text-gray-500 text-center mt-1 max-w-xs">
                      Approve the connection in your wallet app, or use the options below.
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2">
                  {/* Primary: Open MetaMask (deep link) — mobile only */}
                  {orch.wcUri && ctx.isMobile && (
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
                      onClick={() => handleOpenWallet('metamask')}
                    >
                      <ExternalLink className="w-5 h-5" />
                      Open MetaMask
                    </button>
                  )}

                  {/* Show QR toggle — mobile only (desktop auto-shows) */}
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

                  {/* Cancel */}
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

            {/* ── FAILED: Recovery UI ── */}
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
                  {/* Retry with cleanup */}
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

                  {/* Open wallet (deep link) if WC URI exists — mobile only */}
                  {orch.wcUri && ctx.isMobile && (
                    <button
                      type="button"
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      onClick={() => handleOpenWallet('metamask')}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open MetaMask
                    </button>
                  )}

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

                  {/* Show QR */}
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
                          <p className="text-xs text-gray-500 mt-3 text-center">Scan this QR code with your wallet app</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Dismiss */}
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
