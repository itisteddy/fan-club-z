import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import App from './App.tsx'
import LandingPage from './landing/LandingPage'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { NetworkStatusProvider } from './providers/NetworkStatusProvider'
import { SupabaseProvider } from './providers/SupabaseProvider'
import { AuthSessionProvider } from './providers/AuthSessionProvider'
import { ErrorHandlingProvider } from './components/ErrorHandlingProvider'
import { config } from './lib/wagmi'
import './index.css'
import { APP_VERSION, BUILD_TIMESTAMP } from './lib/version.ts'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

// Centralized version management
console.log(`🚀 Fan Club Z ${APP_VERSION} - CONSOLIDATED ARCHITECTURE - SINGLE SOURCE OF TRUTH`)

// Log betting mode configuration on startup (helps diagnose production issues)
const FLAG_BASE_BETS = import.meta.env.VITE_FCZ_BASE_BETS === '1' || 
                       import.meta.env.ENABLE_BASE_BETS === '1' ||
                       import.meta.env.FCZ_ENABLE_BASE_BETS === '1' ||
                       import.meta.env.VITE_FCZ_BASE_ENABLE === '1';
const FLAG_DEMO = import.meta.env.VITE_FCZ_ENABLE_DEMO === '1';
const isCryptoMode = FLAG_BASE_BETS && !FLAG_DEMO;

console.log('🔍 Betting Mode Configuration:', {
  VITE_FCZ_BASE_BETS: import.meta.env.VITE_FCZ_BASE_BETS,
  VITE_FCZ_ENABLE_DEMO: import.meta.env.VITE_FCZ_ENABLE_DEMO,
  FLAG_BASE_BETS,
  FLAG_DEMO,
  isCryptoMode,
  mode: isCryptoMode ? '✅ ON-CHAIN' : '⚠️ DEMO MODE (check VITE_FCZ_BASE_BETS=1 in Vercel)'
});

const isLandingBuild = import.meta.env.VITE_BUILD_TARGET === 'landing';
const RootComponent = isLandingBuild ? LandingPage : App;

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Optionally prevent the default browser behavior
  // event.preventDefault();
});

// Global error handler for general errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)

console.log(`✅ Fan Club Z ${APP_VERSION} - Application started successfully`);
console.log('🚀 Build timestamp:', BUILD_TIMESTAMP);