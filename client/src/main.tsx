import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 Fan Club Z v2.0.18 - FIXED DATA ARCHITECTURE & TIME')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log('✅ Fan Club Z v2.0.18 - Application started successfully');
console.log('🚀 Build timestamp:', new Date().toISOString());
