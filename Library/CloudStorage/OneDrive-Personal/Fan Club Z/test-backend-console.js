// Backend Connectivity Test - Run in Browser Console
// Copy and paste this into your browser console to test backend connection

console.log('🔍 Testing Backend Connectivity...');

async function testBackend() {
  const tests = [
    { name: 'Health Check', url: 'http://localhost:3001/health' },
    { name: 'API Root', url: 'http://localhost:3001/api' },
    { name: 'Bets Endpoint', url: 'http://localhost:3001/api/bets' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`\n🧪 Testing: ${test.name}`);
      console.log(`   URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`   ✅ ${test.name}: WORKING`);
        try {
          const data = await response.json();
          console.log(`   Data:`, data);
        } catch (e) {
          console.log(`   Data: (Not JSON)`);
        }
      } else {
        console.log(`   ⚠️  ${test.name}: HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${test.name}: FAILED`);
      console.log(`   Error: ${error.message}`);
      
      if (error.message.includes('fetch')) {
        console.log(`   💡 Backend server is likely not running`);
      }
    }
  }
  
  console.log('\n📋 Next Steps:');
  console.log('1. If all tests fail: Start backend with "cd server && npm run dev"');
  console.log('2. If health check works but API fails: Check CORS configuration');
  console.log('3. If nothing works: Check if port 3001 is blocked');
}

testBackend().catch(console.error);
