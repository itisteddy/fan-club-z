import React from 'react'
import { getApiUrl } from '@/lib/utils'
import NotificationTest from './NotificationTest'
import ComplianceTest from './ComplianceTest'

export const DebugPage: React.FC = () => {
  const [apiStatus, setApiStatus] = React.useState<string>('Testing...')
  const [networkInfo, setNetworkInfo] = React.useState<any>({})

  React.useEffect(() => {
    // Get network info
    setNetworkInfo({
      userAgent: navigator.userAgent,
      location: window.location.href,
      origin: window.location.origin,
      apiUrl: getApiUrl(),
    })

    // Test API connection
    fetch(getApiUrl() + '/health')
      .then(response => response.json())
      .then(data => {
        setApiStatus('✅ API Connected: ' + JSON.stringify(data))
      })
      .catch(error => {
        setApiStatus('❌ API Error: ' + error.message)
      })
  }, [])

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      fontSize: '12px',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#22c55e', fontSize: '24px', marginBottom: '20px' }}>
        🚀 Fan Club Z Debug Page
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>📱 Network Info:</h2>
        <pre style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
          {JSON.stringify(networkInfo, null, 2)}
        </pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>🔗 API Status:</h2>
        <div style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
          {apiStatus}
        </div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>🧪 Quick Tests:</h2>
        <div style={{ background: 'white', padding: '10px', borderRadius: '5px' }}>
          <p>✅ React is working</p>
          <p>✅ TypeScript is working</p>
          <p>✅ Component rendering is working</p>
          <p>✅ Styles are working</p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔔 Notification System Test:</h2>
        <div style={{ background: 'white', borderRadius: '5px', overflow: 'hidden' }}>
          <NotificationTest />
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🛡️ Compliance System Test:</h2>
        <div style={{ background: 'white', borderRadius: '5px', overflow: 'hidden' }}>
          <ComplianceTest />
        </div>
      </div>
      
      <button 
        onClick={() => window.location.href = '/discover'}
        style={{
          backgroundColor: '#22c55e',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        🎯 Go to Main App
      </button>
    </div>
  )
}

export default DebugPage