#!/usr/bin/env node

console.log('🧪 Testing Clubs API Endpoints...')

// Test clubs API endpoints
const testClubsAPI = async () => {
  const endpoints = [
    'http://localhost:3001/api/clubs',
    'http://localhost:5000/api/clubs',
    'http://localhost:5001/api/clubs', 
    'http://172.20.2.210:5001/api/clubs'
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 Testing: ${endpoint}`)
      const response = await fetch(endpoint, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })
      
      console.log(`📡 Response status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ API responding successfully')
        console.log('📊 Response structure:', {
          success: data.success,
          hasData: !!data.data,
          hasClubs: !!(data.data?.clubs || data.clubs),
          clubsCount: (data.data?.clubs || data.clubs || []).length,
          sampleClub: (data.data?.clubs || data.clubs || [])[0]?.name
        })
        
        // If we find clubs, show details
        const clubs = data.data?.clubs || data.clubs || []
        if (clubs.length > 0) {
          console.log('📋 Clubs found:')
          clubs.forEach((club, index) => {
            console.log(`  ${index + 1}. ${club.name} (${club.category}) - ${club.memberCount} members`)
          })
        } else {
          console.log('⚠️ No clubs in response')
        }
        
        return { url: endpoint, clubs }
      } else {
        const errorText = await response.text()
        console.log(`❌ Error response:`, errorText)
      }
    } catch (error) {
      console.log(`❌ Request failed:`, error.message)
    }
  }
  
  return null
}

// Test demo user clubs endpoint
const testUserClubsAPI = async (baseUrl) => {
  if (!baseUrl) return
  
  console.log(`🧪 Testing user clubs endpoint...`)
  
  try {
    const endpoint = `${baseUrl}/clubs/user/demo-user-id`
    console.log(`🔗 Testing: ${endpoint}`)
    
    const response = await fetch(endpoint, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    })
    
    console.log(`📡 Response status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ User clubs API responding')
      console.log('📊 User clubs response:', {
        success: data.success,
        hasData: !!data.data,
        hasClubs: !!(data.data?.clubs || data.clubs),
        userClubsCount: (data.data?.clubs || data.clubs || []).length
      })
      
      const userClubs = data.data?.clubs || data.clubs || []
      if (userClubs.length > 0) {
        console.log('📋 User clubs:')
        userClubs.forEach((club, index) => {
          console.log(`  ${index + 1}. ${club.name} (${club.category})`)
        })
      }
    } else {
      const errorText = await response.text()
      console.log(`❌ User clubs error:`, errorText)
    }
  } catch (error) {
    console.log(`❌ User clubs request failed:`, error.message)
  }
}

// Run tests
const runTests = async () => {
  console.log('🚀 Starting clubs API tests...\n')
  
  const result = await testClubsAPI()
  
  if (result) {
    console.log(`\n✅ Working clubs API found: ${result.url}`)
    console.log(`📊 Found ${result.clubs.length} clubs`)
    
    // Test user clubs endpoint
    await testUserClubsAPI(result.url.replace('/clubs', ''))
    
    console.log('\n🎉 Clubs API tests completed successfully!')
    console.log('💡 If frontend is still not loading clubs, check:')
    console.log('   1. Browser console for errors')
    console.log('   2. Network tab in DevTools')
    console.log('   3. API client configuration in frontend')
  } else {
    console.log('\n❌ No working clubs API found.')
    console.log('💡 Make sure the server is running with: npm run dev (in server directory)')
  }
}

runTests().catch(error => {
  console.error('💥 Test runner failed:', error)
  process.exit(1)
})
