import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import LandingRouter from './landing/LandingRouter'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { NetworkStatusProvider } from './providers/NetworkStatusProvider'
import { SupabaseProvider } from './providers/SupabaseProvider'
import { AuthSessionProvider } from './providers/AuthSessionProvider'
import { ErrorHandlingProvider } from './components/ErrorHandlingProvider'
import { Web3Provider } from './providers/Web3Provider'
import './index.css'
import { APP_VERSION, BUILD_TIMESTAMP } from './lib/version.ts'
// [PERF] Web Vitals monitoring
import { initWebVitals } from './lib/vitals'
import { useMaintenanceStore } from './store/maintenanceStore'
// Phase 3: Register native OAuth listener once at bootstrap
import { App as CapacitorApp } from '@capacitor/app'
import { BUILD_TARGET, getBuildDebugInfo } from './config/buildTarget'
import { handleNativeAuthCallback } from './lib/auth/nativeOAuth'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { isNativeIOSRuntime } from './config/native'
import { parseDeepLink } from './utils/deepLinking'

// Centralized version management
console.log(`🚀 Fan Club Z ${APP_VERSION} - CONSOLIDATED ARCHITECTURE - SINGLE SOURCE OF TRUTH`)

// Early boot log: verify BUILD_TARGET is resolved (prevents ReferenceError)
const buildDebug = getBuildDebugInfo();
if (buildDebug) {
  console.log('[bootstrap] BUILD_TARGET=' + BUILD_TARGET + ' MODE=' + buildDebug.mode + ' NATIVE=' + buildDebug.isNative + ' PLATFORM=' + buildDebug.platform);
  console.log('[bootstrap] Build Debug:', buildDebug);
} else {
  console.log('[bootstrap] BUILD_TARGET=' + BUILD_TARGET + ' MODE=' + (import.meta.env.MODE || 'unknown') + ' NATIVE=' + Capacitor.isNativePlatform())
}

// Phase A: Clear any web domain cache/storage on iOS first boot (defensive cleanup)
// This prevents old web bundles from contaminating iOS builds
// Only run if actually in iOS native runtime (fail-safe)
if (isIOSRuntime() && typeof window !== 'undefined') {
  const iOSFirstBootKey = 'ios-cache-cleared-v2';
  if (!localStorage.getItem(iOSFirstBootKey)) {
    console.log('[Bootstrap] iOS first boot: clearing web domain caches');
    
    // Clear service worker registrations
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => {
          console.log('[Bootstrap] Unregistering SW:', reg.scope);
          reg.unregister();
        });
      });
    }
    
    // Clear caches
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          console.log('[Bootstrap] Deleting cache:', key);
          caches.delete(key);
        });
      });
    }
    
    localStorage.setItem(iOSFirstBootKey, 'true');
    console.log('[Bootstrap] ✅ Cache cleanup complete');
  }
}

// Phase 3: Register native OAuth deep link listener ONCE at bootstrap
// CRITICAL: Only register if BOTH build target is iOS AND runtime is native iOS
// This fail-safe prevents iOS builds deployed to web from registering native listeners
import { shouldUseIOSDeepLinks, isIOSRuntime } from './config/platform';

function handleAppDeepLink(url: string): boolean {
  if (!url) return false;
  try {
    const normalized = url.startsWith('fanclubz://')
      ? url.replace('fanclubz://', 'https://')
      : url;
    const parsed = new URL(normalized);
    const info = parseDeepLink(parsed.pathname);
    if (!info.isValid) return false;

    let target = info.path;
    if (info.type === 'prediction' && info.id) target = `/predictions/${info.id}`;
    if (info.type === 'profile' && info.id) target = `/profile/${info.id}`;
    if (info.type === 'discover') target = '/discover';

    if (window.location.pathname !== target) {
      window.location.href = target;
    }
    return true;
  } catch {
    return false;
  }
}

// Register native deep link listeners as early as possible.
// IMPORTANT: Use runtime detection (do not rely on BUILD_TARGET/env).
if ((isNativeIOSRuntime() || Capacitor.getPlatform() === 'android') && typeof window !== 'undefined') {
  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    if (url && !url.startsWith('fanclubz://auth/callback')) {
      if (handleAppDeepLink(url)) return;
    }
    if (!url?.startsWith('fanclubz://auth/callback')) return;

    // CRITICAL: only handle/close for real callback URLs that contain ?code= or token_hash=
    // This prevents prematurely closing the auth sheet during email/password entry.
    let hasAuthParam = false;
    try {
      const u = new URL(url.replace('fanclubz://', 'https://'));
      hasAuthParam = Boolean(u.searchParams.get('code')) || Boolean(u.searchParams.get('token_hash'));
      // Also check hash fragment for access_token (magic link fallback)
      if (!hasAuthParam && u.hash) {
        const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
        hasAuthParam = Boolean(hashParams.get('access_token'));
      }
    } catch {
      hasAuthParam = false;
    }
    if (!hasAuthParam) return;

    console.log('[Bootstrap] appUrlOpen received:', url);

    const ok = await handleNativeAuthCallback(url);
    if (ok) {
      // Close only after successful exchange (best-effort + retry)
      try { await Browser.close() } catch {}
      setTimeout(() => Browser.close().catch(() => {}), 250);
    }
  }).then(() => {
    console.log('[Bootstrap] ✅ Native OAuth listener registered (native runtime)');
  }).catch((err) => {
    console.error('[Bootstrap] ❌ Failed to register native OAuth listener:', err);
  });

  // Handle cold-start deep links (e.g., app launched from OAuth redirect)
  CapacitorApp.getLaunchUrl().then((launch) => {
    if (launch?.url) {
      console.log('[Bootstrap] launchUrl detected:', launch.url);
      // Only handle real callback URLs with code.
      const url = launch.url;
      if (url && !url.startsWith('fanclubz://auth/callback')) {
        if (handleAppDeepLink(url)) return;
      }
      if (!url?.startsWith('fanclubz://auth/callback')) return;
      try {
        const u = new URL(url.replace('fanclubz://', 'https://'));
        if (!u.searchParams.get('code') && !u.searchParams.get('token_hash')) return;
      } catch {
        return;
      }
      handleNativeAuthCallback(url);
    }
  }).catch((err) => {
    console.error('[Bootstrap] ❌ Failed to read launchUrl:', err);
  });
}

// Phase 6: DEV-only runtime diagnostics (gated behind localStorage flag)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const debugEnabled = localStorage.getItem('DEBUG_RUNTIME') === '1';
  if (debugEnabled) {
    import('./config/runtime').then(({ getRuntimeDebugInfo }) => {
      const debugInfo = getRuntimeDebugInfo();
      console.log('═══════════════════════════════════════');
      console.log('[Runtime Debug] Build Configuration:');
      console.log('  BUILD_TARGET:', debugInfo.BUILD_TARGET);
      console.log('  IS_NATIVE:', debugInfo.IS_NATIVE);
      console.log('  STORE_SAFE_MODE:', debugInfo.STORE_SAFE_MODE);
      console.log('  Mode:', debugInfo.mode);
      console.log('  Origin:', debugInfo.origin);
      console.log('  API Base URL:', debugInfo.apiBaseUrl);
      console.log('  Capabilities:', debugInfo.capabilities);
      console.log('═══════════════════════════════════════');
      console.log('[Runtime Debug] Enable with: localStorage.setItem("DEBUG_RUNTIME", "1")');
    });
  }
}

// CRITICAL: Disable browser's native scroll restoration to prevent conflicts with our manual scroll management
// This is essential for React SPA navigation to work correctly
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Global fetch wrapper: detect maintenance-mode 503 responses and show UX
if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (async (...args: Parameters<typeof fetch>) => {
    const res = await originalFetch(...args);

    try {
      // Clear maintenance when API comes back
      if (res.ok && useMaintenanceStore.getState().active) {
        useMaintenanceStore.getState().clear();
      }

      if (res.status === 503) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const cloned = res.clone();
          const data = await cloned.json().catch(() => null);
          if (data?.maintenance) {
            useMaintenanceStore
              .getState()
              .setMaintenance(String(data?.message || 'The platform is currently under maintenance. Please check back soon.'));
          }
        }
      }
    } catch {
      // Never block fetch() if maintenance detection fails
    }

    return res;
  }) as any;
}

const isLandingBuild = import.meta.env.VITE_BUILD_TARGET === 'landing';
const RootComponent = isLandingBuild ? LandingRouter : App;

// Note: Global error handlers are now managed by Web3Provider for WalletConnect errors
// This provides coordinated error handling with automatic session recovery

// CRITICAL: Global handler for dynamic module loading errors (stale Vercel chunks)
// These occur when Vercel deploys new code but the browser has cached old chunk references
window.addEventListener('error', (event) => {
  const isModuleLoadError = 
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Failed to load module script') ||
    event.message?.includes('Loading chunk') ||
    event.filename?.includes('assets/') && event.message?.includes('MIME type');
  
  if (isModuleLoadError) {
    console.warn('🔄 [GLOBAL] Module loading error detected - triggering hard reload');
    event.preventDefault();
    // Clear caches and reload
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    window.location.reload();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason);
  const isModuleLoadError = 
    reason.includes('Failed to fetch dynamically imported module') ||
    reason.includes('Failed to load module script') ||
    reason.includes('Loading chunk');
  
  if (isModuleLoadError) {
    console.warn('🔄 [GLOBAL] Unhandled module loading rejection - triggering hard reload');
    event.preventDefault();
    if ('caches' in window) {
      caches.keys().then(names => names.forEach(name => caches.delete(name)));
    }
    window.location.reload();
  }
});

// Conditionally wrap Web3Provider - only needed for app build, not landing/admin
const AppContent = isLandingBuild ? (
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        if (import.meta.env.DEV) {
          console.error('React Error Boundary triggered:', error, errorInfo);
        }
        // You can add error reporting service here (e.g., Sentry)
      }}
    >
      <ErrorHandlingProvider>
        <NetworkStatusProvider>
          <SupabaseProvider>
            <AuthSessionProvider>
              <BrowserRouter>
                <RootComponent />
              </BrowserRouter>
            </AuthSessionProvider>
          </SupabaseProvider>
        </NetworkStatusProvider>
      </ErrorHandlingProvider>
    </ErrorBoundary>
  </React.StrictMode>
) : (
  <React.StrictMode>
    <Web3Provider>
      <ErrorBoundary
        onError={(error, errorInfo) => {
          if (import.meta.env.DEV) {
            console.error('React Error Boundary triggered:', error, errorInfo);
          }
          // You can add error reporting service here (e.g., Sentry)
        }}
      >
        <ErrorHandlingProvider>
          <NetworkStatusProvider>
            <SupabaseProvider>
              <AuthSessionProvider>
                <BrowserRouter>
                  <RootComponent />
                </BrowserRouter>
              </AuthSessionProvider>
            </SupabaseProvider>
          </NetworkStatusProvider>
        </ErrorHandlingProvider>
      </ErrorBoundary>
    </Web3Provider>
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(AppContent);

console.log(`✅ Fan Club Z ${APP_VERSION} - Application started successfully`);
console.log('🚀 Build timestamp:', BUILD_TIMESTAMP);

// [PERF] Initialize Web Vitals monitoring after app mounts
initWebVitals();
