import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 Fan Club Z v2.0.8 - USD CURRENCY & PERSISTENT WALLET')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log('✅ Fan Club Z v2.0.8 - Application started successfully');
console.log('🚀 Build timestamp:', new Date().toISOString());
