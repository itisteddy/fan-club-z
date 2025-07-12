const fetch = require('node-fetch')

async function testBackendAPIs() {
  console.log('🧪 Testing Backend APIs for Demo User...')
  
  const baseURL = 'http://172.20.2.210:5001/api'
  let accessToken = null
  
  try {
    // Step 1: Test demo login API
    console.log('1️⃣ Testing demo login API...')
    const loginResponse = await fetch(`${baseURL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0'
      },
      body: JSON.stringify({
        email: 'demo@fanclubz.app',
        password: 'demo123'
      })
    })
    
    console.log('📊 Login response status:', loginResponse.status)
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json()
      console.log('✅ Login successful')
      accessToken = loginData.data?.accessToken
      console.log('🔑 Got access token:', accessToken ? 'Yes' : 'No')
    } else {
      const errorData = await loginResponse.json()
      console.log('❌ Login failed:', errorData)
      return
    }
    
    if (!accessToken) {
      console.log('❌ No access token received')
      return
    }
    
    // Step 2: Test wallet balance API
    console.log('2️⃣ Testing wallet balance API...')
    const balanceResponse = await fetch(`${baseURL}/wallet/balance/demo-user-id`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0'
      }
    })
    
    console.log('📊 Balance response status:', balanceResponse.status)
    
    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json()
      console.log('✅ Wallet balance retrieved:', balanceData.data?.balance)
    } else {
      const errorData = await balanceResponse.json()
      console.log('❌ Wallet balance failed:', errorData)
    }
    
    // Step 3: Test trending bets API
    console.log('3️⃣ Testing trending bets API...')
    const betsResponse = await fetch(`${baseURL}/bets/trending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0'
      }
    })
    
    console.log('📊 Trending bets response status:', betsResponse.status)
    
    if (betsResponse.ok) {
      const betsData = await betsResponse.json()
      console.log('✅ Trending bets retrieved:', betsData.data?.bets?.length, 'bets')
    } else {
      const errorData = await betsResponse.json()
      console.log('❌ Trending bets failed:', errorData)
    }
    
    // Step 4: Test user profile API
    console.log('4️⃣ Testing user profile API...')
    const profileResponse = await fetch(`${baseURL}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Agent/1.0'
      }
    })
    
    console.log('📊 Profile response status:', profileResponse.status)
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      console.log('✅ User profile retrieved:', profileData.data?.user?.email)
    } else {
      const errorData = await profileResponse.json()
      console.log('❌ User profile failed:', errorData)
    }
    
    // Step 5: Test multiple rapid requests to check rate limiting
    console.log('5️⃣ Testing rate limiting with rapid requests...')
    const rapidRequests = []
    
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(
        fetch(`${baseURL}/bets/trending`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Test-Agent/1.0'
          }
        })
      )
    }
    
    const rapidResults = await Promise.all(rapidRequests)
    const rateLimitedCount = rapidResults.filter(res => res.status === 429).length
    const successCount = rapidResults.filter(res => res.status === 200).length
    
    console.log('📊 Rapid requests results:')
    console.log('   - Success (200):', successCount)
    console.log('   - Rate Limited (429):', rateLimitedCount)
    
    if (rateLimitedCount === 0) {
      console.log('✅ Rate limiting properly bypassed for demo user')
    } else {
      console.log('❌ Rate limiting not properly bypassed')
    }
    
    console.log('🎉 Backend API test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Add timeout and error handling
const runTest = async () => {
  try {
    await testBackendAPIs()
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

runTest()
