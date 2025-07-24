// Mobile Registration Debug Script
console.log('📱 Mobile Registration Diagnostic Tool');
console.log('====================================');

// Device and Environment Information
console.log('\n🔍 Device Information:');
console.log('User Agent:', navigator.userAgent);
console.log('Screen Size:', `${window.innerWidth}x${window.innerHeight}`);
console.log('Device Pixel Ratio:', window.devicePixelRatio);
console.log('Touch Support:', 'ontouchstart' in window);
console.log('Current URL:', window.location.href);

// Network and API Testing
console.log('\n🌐 Network Testing:');

// Get API URL from the app
const getApiUrl = () => {
  // Try to get the API URL from the environment
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
      return 'http://localhost:3001/api';
    } else {
      // Assume it's the IP address setup
      return `http://${hostname.replace(':3000', '')}:3001/api`;
    }
  }
  return 'http://localhost:3001/api';
};

const apiUrl = getApiUrl();
console.log('Detected API URL:', apiUrl);

// Test API connectivity
const testApiConnectivity = async () => {
  console.log('\n🔗 Testing API Connectivity...');
  
  const testUrls = [
    `${apiUrl}/health`,
    apiUrl.replace('api', 'health'),
    apiUrl.replace(':3001', ':5001'),
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${url}`);
        console.log('Response:', data);
        return url;
      } else {
        console.log(`❌ FAILED: ${url} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${url} - ${error.message}`);
    }
  }
  
  console.log('❌ No working API endpoint found');
  return null;
};

// Test form submission simulation
const testFormSubmission = async (workingApiUrl) => {
  if (!workingApiUrl) {
    console.log('\n❌ Skipping form test - no working API URL');
    return;
  }
  
  console.log('\n📝 Testing Registration Endpoint...');
  
  const testData = {
    firstName: 'Mobile',
    lastName: 'Test',
    username: 'mobiletest123',
    email: 'mobile@test.com',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    password: 'TestPass123!'
  };
  
  try {
    const registrationUrl = workingApiUrl.replace('/health', '') + '/users/register';
    console.log(`Testing registration at: ${registrationUrl}`);
    
    const response = await fetch(registrationUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Registration Response Status:', response.status);
    
    const responseData = await response.json();
    console.log('Registration Response:', responseData);
    
    if (response.ok) {
      console.log('✅ Registration endpoint working!');
    } else {
      console.log('❌ Registration failed:', responseData);
    }
    
  } catch (error) {
    console.log('❌ Registration test error:', error.message);
  }
};

// Browser Capability Tests
const testBrowserCapabilities = () => {
  console.log('\n🧪 Browser Capabilities:');
  console.log('Fetch API:', typeof fetch !== 'undefined');
  console.log('Promise Support:', typeof Promise !== 'undefined');
  console.log('Local Storage:', typeof localStorage !== 'undefined');
  console.log('Session Storage:', typeof sessionStorage !== 'undefined');
  console.log('FormData Support:', typeof FormData !== 'undefined');
  console.log('JSON Support:', typeof JSON !== 'undefined');
  
  // Test form event handling
  console.log('\n📋 Form Event Testing:');
  
  // Create a test form
  const testForm = document.createElement('form');
  const testButton = document.createElement('button');
  testButton.type = 'submit';
  testButton.textContent = 'Test';
  testForm.appendChild(testButton);
  
  let formSubmitTriggered = false;
  let buttonClickTriggered = false;
  
  testForm.addEventListener('submit', (e) => {
    e.preventDefault();
    formSubmitTriggered = true;
    console.log('✅ Form submit event works');
  });
  
  testButton.addEventListener('click', (e) => {
    buttonClickTriggered = true;
    console.log('✅ Button click event works');
  });
  
  // Add to DOM temporarily
  document.body.appendChild(testForm);
  
  // Trigger events
  testButton.click();
  
  setTimeout(() => {
    console.log('Form Submit Triggered:', formSubmitTriggered);
    console.log('Button Click Triggered:', buttonClickTriggered);
    
    // Clean up
    document.body.removeChild(testForm);
  }, 100);
};

// Mobile Safari Specific Tests
const testMobileSafariQuirks = () => {
  console.log('\n🍎 Mobile Safari Specific Tests:');
  
  const isMobileSafari = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Safari/i.test(navigator.userAgent);
  console.log('Is Mobile Safari:', isMobileSafari);
  
  if (isMobileSafari) {
    console.log('iOS Version:', navigator.userAgent.match(/OS (\d+)_(\d+)/)?.[0] || 'Unknown');
    console.log('Standalone Mode:', window.navigator.standalone);
    console.log('Viewport Meta Tag:', document.querySelector('meta[name="viewport"]')?.content || 'Not found');
  }
  
  // Test viewport behavior
  console.log('Window Inner Size:', `${window.innerWidth}x${window.innerHeight}`);
  console.log('Screen Size:', `${screen.width}x${screen.height}`);
  console.log('Device Orientation:', screen.orientation?.type || 'Unknown');
};

// Main diagnostic function
const runDiagnostics = async () => {
  console.log('🚀 Starting Mobile Registration Diagnostics...\n');
  
  // Run all tests
  testBrowserCapabilities();
  testMobileSafariQuirks();
  
  const workingApiUrl = await testApiConnectivity();
  await testFormSubmission(workingApiUrl);
  
  console.log('\n📊 Diagnostic Summary:');
  console.log('=====================================');
  
  if (workingApiUrl) {
    console.log('✅ API Connection: Working');
    console.log('🎯 Next Step: Try registration in the app');
  } else {
    console.log('❌ API Connection: Failed');
    console.log('🔧 Fix: Check server is running and API URL is correct');
    console.log('💡 Suggested API URL:', getApiUrl());
  }
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isLocalhost = window.location.hostname === 'localhost';
  
  if (isMobile && isLocalhost) {
    console.log('⚠️  Mobile + Localhost detected');
    console.log('🔧 Fix: Update API URL to use computer\'s IP address');
  }
  
  console.log('\n🏁 Diagnostics Complete!');
};

// Run diagnostics
runDiagnostics().catch(console.error);

// Export for manual testing
window.mobileDebug = {
  testApiConnectivity,
  testFormSubmission,
  getApiUrl,
  runDiagnostics
};

console.log('\n💡 Manual Testing Available:');
console.log('Run: window.mobileDebug.runDiagnostics()');
console.log('API URL: window.mobileDebug.getApiUrl()');
