import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { initializeAuth } from './store/authStore'
import App from './App'
import './index.css'

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
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <h2>Something went wrong!</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.toString()}
            {this.state.error?.stack}
          </details>
          <button onClick={() => window.location.reload()}>
            Reload App
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// Initialize auth state on app start
console.log('🚀 Initializing Fan Club Z...')
try {
  initializeAuth()
  console.log('✅ Auth initialized')
} catch (error) {
  console.error('❌ Auth initialization failed:', error)
}

const root = ReactDOM.createRoot(document.getElementById('root')!)

console.log('🎯 Rendering App...')
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
