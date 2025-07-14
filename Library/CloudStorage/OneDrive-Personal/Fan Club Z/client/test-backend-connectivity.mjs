#!/usr/bin/env node

console.log('🔍 Testing Backend Connectivity for Demo Login...')

// Test API endpoints
const testEndpoints = async () => {
  const endpoints = [
    'http://localhost:5000/api/health',
    'http://localhost:5001/api/health', 
    'http://172.20.2.210:5001/api/health'
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔗 Testing: ${endpoint}`)
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ${endpoint} - OK`)
        console.log(`📊 Response:`, data)
        return endpoint.replace('/health', '')
      } else {
        console.log(`❌ ${endpoint} - Status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`)
    }
  }
  
  return null
}

// Test demo login specifically
const testDemoLogin = async (baseUrl) => {
  if (!baseUrl) {
    console.log('❌ No working backend found, cannot test demo login')
    return false
  }
  
  console.log(`\n🧪 Testing Demo Login at: ${baseUrl}/users/login`)
  
  try {
    const response = await fetch(`${baseUrl}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'demo@fanclubz.app',
        password: 'demo123'
      })
    })
    
    console.log(`📡 Demo login response status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Demo login successful!')
      console.log('📊 Response data:', {
        success: data.success,
        hasUser: !!data.data?.user,
        hasToken: !!data.data?.accessToken,
        userId: data.data?.user?.id,
        userEmail: data.data?.user?.email
      })
      return true
    } else {
      const errorData = await response.text()
      console.log('❌ Demo login failed')
      console.log('📊 Error response:', errorData)
      return false
    }
  } catch (error) {
    console.log('❌ Demo login request failed:', error.message)
    return false
  }
}

// Run tests
const runTests = async () => {
  console.log('🚀 Starting backend connectivity tests...\n')
  
  const workingEndpoint = await testEndpoints()
  
  if (workingEndpoint) {
    console.log(`\n✅ Working backend found: ${workingEndpoint}`)
    const loginSuccess = await testDemoLogin(workingEndpoint)
    
    if (loginSuccess) {
      console.log('\n🎉 All tests passed! Backend is working correctly.')
      console.log('💡 Recommended .env.local setting:')
      console.log(`VITE_API_URL=${workingEndpoint}`)
    } else {
      console.log('\n❌ Backend is accessible but demo login is not working.')
    }
  } else {
    console.log('\n❌ No working backend found.')
    console.log('💡 Make sure the server is running with: npm run dev')
    console.log('💡 Check if the server is running on:')
    console.log('   - http://localhost:5000')
    console.log('   - http://localhost:5001') 
    console.log('   - http://172.20.2.210:5001')
  }
}

runTests().catch(error => {
  console.error('💥 Test runner failed:', error)
  process.exit(1)
})
