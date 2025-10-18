import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { NetworkStatusProvider } from './providers/NetworkStatusProvider'
import { SupabaseProvider } from './providers/SupabaseProvider'
import { AuthSessionProvider } from './providers/AuthSessionProvider'
import { ErrorHandlingProvider } from './components/ErrorHandlingProvider'
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
                  <App />
                </BrowserRouter>
              </AuthSessionProvider>
            </SupabaseProvider>
          </NetworkStatusProvider>
        </ErrorHandlingProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
)

console.log(`✅ Fan Club Z ${APP_VERSION} - Application started successfully`);
console.log('🚀 Build timestamp:', BUILD_TIMESTAMP);