const { execSync } = require('child_process');

console.log('🧪 Testing Auth Fixes...\n');

// Test 1: Check if server is running
console.log('1. Testing server health...');
try {
  const healthResponse = execSync('curl -s http://localhost:3001/api/health', { encoding: 'utf8' });
  const health = JSON.parse(healthResponse);
  console.log('✅ Server is running:', health.message);
} catch (error) {
  console.log('❌ Server not running. Please start with: npm run dev');
  process.exit(1);
}

// Test 2: Test registration with valid data
console.log('\n2. Testing registration...');
try {
  const registrationData = {
    firstName: 'Test',
    lastName: 'User',
    username: 'testuser123',
    email: 'test@example.com',
    phone: '+1234567890',
    password: 'TestPass123',
    dateOfBirth: '1990-01-01'
  };

  const regResponse = execSync(
    `curl -s -X POST http://localhost:3001/api/users/register ` +
    `-H "Content-Type: application/json" ` +
    `-d '${JSON.stringify(registrationData)}'`,
    { encoding: 'utf8' }
  );
  
  const regResult = JSON.parse(regResponse);
  
  if (regResult.success) {
    console.log('✅ Registration successful');
  } else {
    console.log('⚠️  Registration failed (expected if user exists):', regResult.error);
    if (regResult.details) {
      console.log('   Details:', regResult.details);
    }
  }
} catch (error) {
  console.log('❌ Registration test failed:', error.message);
}

// Test 3: Test demo login
console.log('\n3. Testing demo login...');
try {
  const loginData = {
    email: 'demo@fanclubz.app',
    password: 'demo123'
  };

  const loginResponse = execSync(
    `curl -s -X POST http://localhost:3001/api/users/login ` +
    `-H "Content-Type: application/json" ` +
    `-d '${JSON.stringify(loginData)}'`,
    { encoding: 'utf8' }
  );
  
  const loginResult = JSON.parse(loginResponse);
  
  if (loginResult.success) {
    console.log('✅ Demo login successful');
    console.log('   User:', loginResult.data.user.firstName, loginResult.data.user.lastName);
  } else {
    console.log('❌ Demo login failed:', loginResult.error);
    if (loginResult.details) {
      console.log('   Details:', loginResult.details);
    }
  }
} catch (error) {
  console.log('❌ Demo login test failed:', error.message);
}

// Test 4: Test validation errors
console.log('\n4. Testing validation errors...');
try {
  const invalidData = {
    email: 'invalid-email',
    password: '123'
  };

  const invalidResponse = execSync(
    `curl -s -X POST http://localhost:3001/api/users/login ` +
    `-H "Content-Type: application/json" ` +
    `-d '${JSON.stringify(invalidData)}'`,
    { encoding: 'utf8' }
  );
  
  const invalidResult = JSON.parse(invalidResponse);
  
  if (!invalidResult.success && invalidResult.details) {
    console.log('✅ Validation errors working correctly');
    console.log('   Sample error:', invalidResult.details[0]);
  } else {
    console.log('⚠️  Validation might not be working as expected');
  }
} catch (error) {
  console.log('❌ Validation test failed:', error.message);
}

console.log('\n🏁 Auth fixes testing complete!');
console.log('\nNext steps:');
console.log('1. Test registration on mobile device');
console.log('2. Test login after registration');
console.log('3. Verify error messages are user-friendly');
