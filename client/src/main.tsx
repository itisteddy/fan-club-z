import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { APP_VERSION, BUILD_TIMESTAMP } from './lib/version.ts'

// Centralized version management
console.log(`🚀 Fan Club Z ${APP_VERSION} - CONSOLIDATED ARCHITECTURE - SINGLE SOURCE OF TRUTH`)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log(`✅ Fan Club Z ${APP_VERSION} - Application started successfully`);
console.log('🚀 Build timestamp:', BUILD_TIMESTAMP);
