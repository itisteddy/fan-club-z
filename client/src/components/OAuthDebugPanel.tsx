import React from 'react';

interface OAuthDebugPanelProps {
  show: boolean;
  onClose: () => void;
}

export const OAuthDebugPanel: React.FC<OAuthDebugPanelProps> = ({ show, onClose }) => {
  if (!show) return null;

  const debugInfo = {
    // Current environment
    environment: {
      isDev: import.meta.env.DEV,
      mode: import.meta.env.MODE,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing',
      supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing',
    },

    // Current URL info
    currentUrl: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      fullUrl: window.location.href,
    },

    // Expected OAuth callback URL
    expectedCallback: `${window.location.origin}/auth/callback`,

    // URL analysis
    urlAnalysis: {
      hasCode: new URL(window.location.href).searchParams.has('code'),
      hasError: new URL(window.location.href).searchParams.has('error'),
      hasAccessToken: window.location.hash.includes('access_token'),
      codeValue: new URL(window.location.href).searchParams.get('code'),
      errorValue: new URL(window.location.href).searchParams.get('error'),
      errorDescription: new URL(window.location.href).searchParams.get('error_description'),
    },

    // Storage analysis
    localStorage: {
      supabaseKeys: Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('sb-')
      ),
      authStorageKeys: Object.keys(localStorage).filter(key => 
        key.includes('auth')
      ),
    },
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#111827'
          }}>
            OAuth Debug Information
          </h2>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#6b7280'
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {/* Environment Info */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Environment
            </h3>
            <pre style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(debugInfo.environment, null, 2)}
            </pre>
          </div>

          {/* Current URL */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Current URL
            </h3>
            <pre style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(debugInfo.currentUrl, null, 2)}
            </pre>
          </div>

          {/* OAuth Analysis */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              OAuth URL Analysis
            </h3>
            <pre style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(debugInfo.urlAnalysis, null, 2)}
            </pre>
          </div>

          {/* Expected vs Actual */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Expected OAuth Callback URL
            </h3>
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #d1fae5',
              padding: '12px',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {debugInfo.expectedCallback}
            </div>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              Make sure this URL is configured in your Supabase OAuth settings
            </p>
          </div>

          {/* Storage Analysis */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Browser Storage
            </h3>
            <pre style={{
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '12px',
              overflow: 'auto'
            }}>
              {JSON.stringify(debugInfo.localStorage, null, 2)}
            </pre>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear Storage & Reload
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Copy Debug Info
              </button>
              <button
                onClick={() => window.location.href = '/'}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};