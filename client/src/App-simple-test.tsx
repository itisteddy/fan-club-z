import React from 'react';

function App() {
  console.log('App is loading...');
  
  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'Inter, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 30%, #ecfdf5 70%, #f0fdfa 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          borderRadius: '20px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: 'bold',
          color: 'white'
        }}>
          Z
        </div>
        
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '16px',
          margin: '0 0 16px 0'
        }}>
          Fan Club Z v2.0
        </h1>
        
        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          🎉 Modern UI Successfully Loaded!
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            background: '#f0fdf4',
            padding: '20px',
            borderRadius: '16px',
            border: '2px solid #bbf7d0'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d' }}>
              Modern Design
            </div>
          </div>
          
          <div style={{
            background: '#f0fdf4',
            padding: '20px',
            borderRadius: '16px',
            border: '2px solid #bbf7d0'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚡</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d' }}>
              Fast Performance
            </div>
          </div>
          
          <div style={{
            background: '#f0fdf4',
            padding: '20px',
            borderRadius: '16px',
            border: '2px solid #bbf7d0'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📱</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d' }}>
              Mobile First
            </div>
          </div>
          
          <div style={{
            background: '#f0fdf4',
            padding: '20px',
            borderRadius: '16px',
            border: '2px solid #bbf7d0'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎨</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#15803d' }}>
              Premium UX
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            // Switch back to main app
            console.log('Switching to main app...');
            alert('Ready to load the full Fan Club Z experience!');
          }}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 24px rgba(34, 197, 94, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(34, 197, 94, 0.3)';
          }}
        >
          Enter Fan Club Z 🚀
        </button>
        
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#f8f9fa',
          borderRadius: '12px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <strong>Status:</strong> All modern components loaded successfully ✨
        </div>
      </div>
    </div>
  );
}

export default App;