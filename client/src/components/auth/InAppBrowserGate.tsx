/**
 * InAppBrowserGate — Blocking modal shown when a user tries to use
 * Google OAuth from inside an in-app browser (MetaMask, Instagram, etc.).
 *
 * Google returns 403 disallowed_useragent for these contexts.
 * Instead of letting the user hit a dead-end, we intercept before the
 * redirect and show a helpful "Open in Chrome / Safari" screen.
 *
 * CRITICAL DESIGN DECISIONS:
 * - "Open in Chrome/Safari" uses button onClick, NOT <a href target="_blank">
 *   because Android in-app browsers may block target="_blank" or intent:// in <a> tags.
 * - Android intent includes S.browser_fallback_url for Chrome not installed edge case.
 * - iOS opens the HTTPS URL directly — iOS handles routing to Safari automatically.
 */

import React, { useState, useCallback } from 'react';
import { ExternalLink, Copy, Check, AlertTriangle } from 'lucide-react';
import {
  getBrowserContext,
  getOpenInSystemBrowserUrl,
  copyLinkToClipboard,
} from '@/lib/browserContext';

interface InAppBrowserGateProps {
  open: boolean;
  onClose: () => void;
  /** Optional path to pass to the system browser (defaults to current page) */
  targetPath?: string;
}

const FRIENDLY_NAMES: Record<string, string> = {
  metamask: 'MetaMask',
  trust: 'Trust Wallet',
  coinbase: 'Coinbase Wallet',
  rainbow: 'Rainbow',
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  twitter: 'X (Twitter)',
  snapchat: 'Snapchat',
  linkedin: 'LinkedIn',
  line: 'LINE',
  wechat: 'WeChat',
  unknown: 'this app',
};

export default function InAppBrowserGate({ open, onClose, targetPath }: InAppBrowserGateProps) {
  const [copied, setCopied] = useState(false);
  const ctx = getBrowserContext();
  const appLabel = ctx.inAppName ? FRIENDLY_NAMES[ctx.inAppName] || ctx.inAppName : 'this app';
  const browserLabel = ctx.os === 'ios' ? 'Safari' : 'Chrome';

  const handleCopy = useCallback(async () => {
    const ok = await copyLinkToClipboard(targetPath);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [targetPath]);

  /**
   * CRITICAL: Open system browser via button onClick (user gesture).
   *
   * On Android in-app browsers:
   * - <a href="intent://..." target="_blank"> is often blocked or ignored
   * - window.location.href = intent:// is the reliable approach from onClick
   *
   * On iOS in-app browsers:
   * - window.open(url) or window.location.href = url triggers the OS
   *   "Open in Safari" sheet automatically
   */
  const handleOpenInBrowser = useCallback(() => {
    const systemUrl = getOpenInSystemBrowserUrl(targetPath);
    console.log('[InAppBrowserGate] Opening system browser:', systemUrl);

    if (ctx.os === 'android') {
      // Direct assign for intent:// URLs (user gesture context)
      window.location.href = systemUrl;
    } else {
      // iOS: window.open triggers Safari sheet; fallback to location.href
      const win = window.open(systemUrl, '_blank');
      if (!win) {
        window.location.href = systemUrl;
      }
    }
  }, [targetPath, ctx.os]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />

        <div className="px-6 pt-5 pb-2">
          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>

          <h2 className="text-lg font-semibold text-gray-900">Open in {browserLabel}</h2>
          <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
            Google sign-in isn't supported inside {appLabel}. 
            Open Fan Club Z in {browserLabel} to continue.
          </p>
        </div>

        <div className="px-6 pt-3 pb-4 space-y-3">
          {/* Primary: Open in system browser — MUST be button onClick, NOT <a href> */}
          <button
            type="button"
            onClick={handleOpenInBrowser}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 active:bg-emerald-700 transition-colors shadow-sm"
          >
            <ExternalLink className="w-5 h-5" />
            Open in {browserLabel}
          </button>

          {/* Secondary: Copy link */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border-2 border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy link
              </>
            )}
          </button>

          {/* Tertiary: Continue with email instead */}
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Use email sign-in instead
          </button>
        </div>
      </div>
    </div>
  );
}
