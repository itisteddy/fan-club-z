import React from 'react';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp';
import './index.css';

// Simple error boundary
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Simple Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#fee2e2',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            textAlign: 'center',
            maxWidth: '500px'
          }}>
            <h2 style={{ color: '#dc2626', marginBottom: '20px' }}>
              🚨 Error Detected
            </h2>
            <p style={{ marginBottom: '20px', color: '#6b7280' }}>
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
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
                🔄 Reload
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
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Check URL parameters
const urlParams = new URLSearchParams(window.location.search);
const isMinimalMode = urlParams.has('minimal') || urlParams.has('test') || urlParams.has('simple');

console.log('🎯 Loading app in mode:', isMinimalMode ? 'MINIMAL' : 'FULL');

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isMinimalMode) {
  // Load minimal test app only
  root.render(
    <React.StrictMode>
      <SimpleErrorBoundary>
        <TestApp />
      </SimpleErrorBoundary>
    </React.StrictMode>
  );
} else {
  // Try to load full app, fall back to minimal on error
  try {
    // Dynamically import the full app
    import('./App').then((AppModule) => {
      const App = AppModule.default;
      
      // Try to import other dependencies
      Promise.all([
        import('@tanstack/react-query').then(m => m.QueryClientProvider),
        import('./lib/queryClient').then(m => m.queryClient),
      ]).then(([QueryClientProvider, queryClient]) => {
        root.render(
          <React.StrictMode>
            <SimpleErrorBoundary>
              <QueryClientProvider client={queryClient}>
                <App />
              </QueryClientProvider>
            </SimpleErrorBoundary>
          </React.StrictMode>
        );
      }).catch((error) => {
        console.error('Failed to load app dependencies:', error);
        console.log('Falling back to minimal mode...');
        root.render(
          <React.StrictMode>
            <SimpleErrorBoundary>
              <TestApp />
            </SimpleErrorBoundary>
          </React.StrictMode>
        );
      });
    }).catch((error) => {
      console.error('Failed to load main App:', error);
      console.log('Falling back to minimal mode...');
      root.render(
        <React.StrictMode>
          <SimpleErrorBoundary>
            <TestApp />
          </SimpleErrorBoundary>
        </React.StrictMode>
      );
    });
  } catch (error) {
    console.error('Critical error during app initialization:', error);
    root.render(
      <React.StrictMode>
        <SimpleErrorBoundary>
          <TestApp />
        </SimpleErrorBoundary>
      </React.StrictMode>
    );
  }
}
