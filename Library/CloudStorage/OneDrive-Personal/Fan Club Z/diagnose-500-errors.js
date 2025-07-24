#!/usr/bin/env node

import { exec } from 'child_process'
import { promisify } from 'util'
import fetch from 'node-fetch'

const execAsync = promisify(exec)

console.log('🔍 Diagnosing Fan Club Z 500 Errors...\n')

// Check if processes are running
async function checkProcesses() {
  console.log('📋 Checking running processes...')
  try {
    const { stdout } = await execAsync('ps aux | grep -E "node|tsx|vite" | grep -v grep')
    console.log('Running processes:')
    console.log(stdout || 'No relevant processes found')
  } catch (error) {
    console.log('No relevant processes found')
  }
  console.log('')
}

// Check ports
async function checkPorts() {
  console.log('🔌 Checking port usage...')
  
  const ports = [3000, 3001, 5001]
  
  for (const port of ports) {
    try {
      const { stdout } = await execAsync(`lsof -i :${port}`)
      console.log(`Port ${port}: OCCUPIED`)
      console.log(stdout)
    } catch (error) {
      console.log(`Port ${port}: Available`)
    }
  }
  console.log('')
}

// Test API endpoints
async function testEndpoints() {
  console.log('🌐 Testing API endpoints...')
  
  const endpoints = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5001',
    'http://localhost:3001/health',
    'http://localhost:5001/health',
    'http://localhost:3000/api/health',
    'http://localhost:3001/api/health',
    'http://localhost:5001/api/health'
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { timeout: 5000 })
      const status = response.status
      const text = await response.text()
      console.log(`✅ ${endpoint}: ${status} - ${text.substring(0, 100)}...`)
    } catch (error) {
      console.log(`❌ ${endpoint}: ${error.message}`)
    }
  }
  console.log('')
}

// Check environment variables
async function checkEnvironment() {
  console.log('🔧 Checking environment configuration...')
  
  // Read .env files
  try {
    const { stdout: rootEnv } = await execAsync('cat .env.local 2>/dev/null || echo "No root .env.local"')
    console.log('Root .env.local:')
    console.log(rootEnv)
    
    const { stdout: serverEnv } = await execAsync('cat server/.env 2>/dev/null || echo "No server .env"')
    console.log('Server .env:')
    console.log(serverEnv)
    
    const { stdout: clientEnv } = await execAsync('cat client/.env.local 2>/dev/null || echo "No client .env.local"')
    console.log('Client .env.local:')
    console.log(clientEnv)
  } catch (error) {
    console.log('Error reading environment files:', error.message)
  }
  console.log('')
}

// Test Vite proxy specifically
async function testViteProxy() {
  console.log('🔄 Testing Vite proxy configuration...')
  
  try {
    // Test direct API call to see if proxy works
    const response = await fetch('http://localhost:3000/api/health', { timeout: 5000 })
    const status = response.status
    const text = await response.text()
    console.log(`Vite proxy test: ${status}`)
    console.log(`Response: ${text}`)
  } catch (error) {
    console.log(`Vite proxy test failed: ${error.message}`)
  }
  console.log('')
}

// Run all diagnostics
async function runDiagnostics() {
  await checkProcesses()
  await checkPorts()
  await checkEnvironment()
  await testEndpoints()
  await testViteProxy()
  
  console.log('🎯 Summary and Recommendations:')
  console.log('1. Check if backend is running on correct port (should be 5001)')
  console.log('2. Verify Vite proxy configuration points to correct backend port')
  console.log('3. Ensure CORS origins include frontend URL')
  console.log('4. Check if database connection is working')
  console.log('5. Verify all environment variables are properly set')
}

runDiagnostics().catch(console.error)
