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

// Centralized version management
console.log(`🚀 Fan Club Z ${APP_VERSION} - CONSOLIDATED ARCHITECTURE - SINGLE SOURCE OF TRUTH`)

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
