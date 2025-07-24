import React, { useEffect, useState } from 'react'

const MobileDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const runDiagnostics = () => {
      try {
        const data = {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          reactMode: process.env.NODE_ENV,
          online: navigator.onLine,
          localStorage: {
            authToken: !!localStorage.getItem('auth_token'),
            accessToken: !!localStorage.getItem('accessToken'),
            refreshToken: !!localStorage.getItem('refreshToken'),
            complianceStatus: !!localStorage.getItem('compliance_status')
          }
        }
        
        setDiagnostics(data)
        setError('')
      } catch (err: any) {
        setError(err.message || 'Unknown error')
      }
    }
    
    runDiagnostics()
    const interval = setInterval(runDiagnostics, 3000)
    return () => clearInterval(interval)
  }, [])

  const testNavigation = () => {
    window.location.href = '/discover'
  }

  const clearStorage = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      fontSize: '14px',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ 
        color: '#28a745', 
        marginBottom: '20px',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        Mobile Diagnostic Tool
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testNavigation}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#007AFF', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            marginRight: '10px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Go to Discover
        </button>
        
        <button 
          onClick={clearStorage}
          style={{ 
            padding: '12px 24px', 
            backgroundColor: '#FF3B30', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Clear Storage & Reload
        </button>
      </div>
      
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd',
        overflow: 'auto'
      }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>System Information</h3>
        <pre style={{ 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </div>
    </div>
  )
}

export default MobileDiagnostic