import fetch from 'node-fetch';

async function testClubsAPI() {
  console.log('🧪 Testing Clubs API endpoints...');
  
  const baseUrls = [
    'http://localhost:3001/api',
    'http://localhost:5001/api',
    'http://127.0.0.1:3001/api'
  ];
  
  let workingUrl = null;
  
  // Find working API URL
  for (const url of baseUrls) {
    try {
      console.log(`🔍 Testing ${url}...`);
      const response = await fetch(`${url}/health`, { timeout: 3000 });
      if (response.ok) {
        console.log(`✅ API responding at ${url}`);
        workingUrl = url;
        break;
      }
    } catch (error) {
      console.log(`❌ ${url} not accessible`);
    }
  }
  
  if (!workingUrl) {
    console.log('❌ No working API URL found');
    return;
  }
  
  // Test clubs endpoint
  try {
    console.log('🔍 Testing GET /clubs...');
    const response = await fetch(`${workingUrl}/clubs`);
    const data = await response.json();
    
    console.log('📊 Clubs API response status:', response.status);
    console.log('📊 Clubs API response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Clubs API is working');
      
      if (data.success && data.data && data.data.clubs) {
        console.log(`📊 Found ${data.data.clubs.length} clubs`);
      } else if (data.clubs) {
        console.log(`📊 Found ${data.clubs.length} clubs (alternate structure)`);
      } else {
        console.log('⚠️ Unexpected clubs response structure');
      }
    } else {
      console.log('❌ Clubs API returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing clubs API:', error.message);
  }
  
  // Test demo user clubs endpoint
  try {
    console.log('🔍 Testing GET /clubs/user/demo-user-id...');
    const response = await fetch(`${workingUrl}/clubs/user/demo-user-id`);
    const data = await response.json();
    
    console.log('📊 User clubs API response status:', response.status);
    console.log('📊 User clubs API response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ User clubs API is working');
    } else {
      console.log('❌ User clubs API returned error:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing user clubs API:', error.message);
  }
  
  console.log('🏁 Clubs API testing complete');
}

testClubsAPI().catch(console.error);
