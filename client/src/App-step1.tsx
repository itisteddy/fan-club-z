import React from 'react';
import './index-minimal.css';

console.log('App.tsx is loading...');

function App() {
  console.log('App component is rendering...');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0', 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif' 
    }}>
      <div style={{ 
        maxWidth: '400px', 
        margin: '0 auto', 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', marginBottom: '20px' }}>Step 1: Basic React Test</h1>
        
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          ✅ If you see this, React is working
        </div>
        
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          ✅ CSS is loading
        </div>
        
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          ✅ JavaScript is executing
        </div>
        
        <button 
          onClick={() => {
            console.log('Button clicked!');
            alert('Button works!');
          }}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            fontSize: '16px'
          }}
        >
          Test Button Click
        </button>
        
        <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
          <p>Time: {new Date().toLocaleTimeString()}</p>
          <p>If this shows, React is definitely working</p>
        </div>
      </div>
    </div>
  );
}

console.log('App.tsx loaded successfully');

export default App;
