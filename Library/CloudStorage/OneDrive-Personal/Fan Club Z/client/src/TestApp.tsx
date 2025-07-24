import React from 'react';

// Minimal test component to verify React is working
const TestApp: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f9ff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        <h1 style={{ color: '#059669', fontSize: '2.5em', margin: '0 0 20px 0' }}>
          🎯 Fan Club Z
        </h1>
        <div style={{
          backgroundColor: '#10b981',
          color: 'white',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontWeight: 'bold'
        }}>
          ✅ React is Working!
        </div>
        
        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
          This is a minimal test to verify the app loads correctly.
        </p>
        
        <div style={{ 
          backgroundColor: '#f3f4f6', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '14px',
          textAlign: 'left'
        }}>
          <strong>Debug Info:</strong><br/>
          📱 User Agent: {navigator.userAgent.substring(0, 50)}...<br/>
          🌐 Host: {window.location.host}<br/>
          📍 Path: {window.location.pathname}<br/>
          ⏰ Time: {new Date().toLocaleString()}
        </div>
        
        <button
          onClick={() => {
            console.log('Button clicked!');
            alert('React event handling works!');
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Interaction
        </button>
        
        <button
          onClick={() => window.location.reload()}
          style={{
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          Reload
        </button>
        
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#9ca3af' }}>
          If you see this, the compilation and rendering are working correctly.
        </div>
      </div>
    </div>
  );
};

export default TestApp;
