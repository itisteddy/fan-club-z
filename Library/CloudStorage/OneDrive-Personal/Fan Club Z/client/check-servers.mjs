#!/usr/bin/env node

console.log('🏥 Server Health Check...\n');

async function checkServer(url, name) {
  try {
    console.log(`🔍 Checking ${name} at ${url}...`);
    const response = await fetch(url);
    console.log(`✅ ${name}: Status ${response.status} ${response.statusText}`);
    
    if (url.includes('/api/')) {
      const data = await response.text();
      console.log(`📄 Response: ${data.substring(0, 100)}...`);
    }
    
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function runHealthCheck() {
  console.log('Checking server connectivity...\n');
  
  // Check frontend
  const frontendOk = await checkServer('http://localhost:3000', 'Frontend');
  
  // Check backend health
  const backendHealthOk = await checkServer('http://localhost:3001/api/health', 'Backend Health');
  
  // Check clubs API specifically
  const clubsApiOk = await checkServer('http://localhost:3001/api/clubs', 'Clubs API');
  
  // Check auth API
  const authApiOk = await checkServer('http://localhost:3001/api/users/login', 'Auth API (POST endpoint accessible)');
  
  console.log('\n📊 Health Check Summary:');
  console.log(`Frontend (port 3000): ${frontendOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Backend Health: ${backendHealthOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Clubs API: ${clubsApiOk ? '✅ OK' : '❌ FAILED'}`);
  console.log(`Auth API: ${authApiOk ? '✅ OK' : '❌ FAILED'}`);
  
  if (frontendOk && backendHealthOk && clubsApiOk) {
    console.log('\n🎉 All servers are healthy!');
    return true;
  } else {
    console.log('\n⚠️ Some servers are not responding correctly.');
    console.log('Please ensure both frontend and backend are running:');
    console.log('  Frontend: cd client && npm run dev');
    console.log('  Backend: cd server && npm run dev');
    return false;
  }
}

runHealthCheck().catch(console.error);
