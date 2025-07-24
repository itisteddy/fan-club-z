import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { initializeAuth } from './store/authStore'
import { initProductionConfig } from './config/production-config'
import App from './App'
import TestApp from './TestApp'
import './index.css'

// Initialize production configuration to clean console output
initProductionConfig()

// Add error boundary and debugging
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          fontFamily: 'monospace',
          backgroundColor: '#fee2e2',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            maxWidth: '600px'
          }}>
            <h2 style={{ color: '#dc2626', marginBottom: '20px' }}>🚨 App Crashed!</h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>
              The app encountered an error. This helps us debug the issue.
            </p>
            <details style={{ 
              whiteSpace: 'pre-wrap', 
              backgroundColor: '#f9fafb',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔍 Error Details</summary>
              <br/>
              <strong>Error:</strong> {this.state.error?.message}<br/><br/>
              <strong>Stack:</strong><br/>{this.state.error?.stack}
            </details>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🔄 Reload App
              </button>
              <button 
                onClick={() => window.location.href = '/?minimal'}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🧪 Test Mode
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🗑️ Clear Data
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Check if we should load minimal test app
const urlParams = new URLSearchParams(window.location.search);
const isMinimalMode = urlParams.has('minimal') || urlParams.has('test');

// Initialize auth state on app start (only for full app)
if (!isMinimalMode) {
  try {
    initializeAuth()
    // Auth initialized successfully
  } catch (error) {
    console.error('❌ Auth initialization failed:', error)
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

// App rendering

// Render appropriate app based on mode
if (isMinimalMode) {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <TestApp />
      </ErrorBoundary>
    </React.StrictMode>,
  )
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
