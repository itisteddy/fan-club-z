import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 Fan Club Z v2.0 - Starting application... (Debug removed, DB fixes applied, v2.1)')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log('✅ Fan Club Z v2.0.4 - Application started successfully');
console.log('🚀 Build timestamp:', new Date().toISOString());
