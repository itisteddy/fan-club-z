#!/usr/bin/env node

/**
 * WebSocket Connection Testing Utility for Fan Club Z
 * This script tests WebSocket connections and CORS configuration
 */

const { io } = require('socket.io-client');
const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test HTTP endpoint
function testHttpEndpoint(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(`${url}/health`, (res) => {
      if (res.statusCode === 200) {
        log(`✅ HTTP endpoint accessible: ${url}`, 'green');
        resolve(true);
      } else {
        log(`❌ HTTP endpoint failed: ${url} (${res.statusCode})`, 'red');
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      log(`❌ HTTP connection error: ${url} - ${error.message}`, 'red');
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      log(`❌ HTTP request timeout: ${url}`, 'red');
      req.abort();
      resolve(false);
    });
  });
}

// Test Socket.IO connection
function testSocketConnection(url, origin = null) {
  return new Promise((resolve) => {
    log(`🔗 Testing WebSocket connection to: ${url}`, 'blue');
    if (origin) log(`   Origin: ${origin}`, 'blue');
    
    const socketOptions = {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    };
    
    if (origin) {
      socketOptions.extraHeaders = {
        'Origin': origin
      };
    }
    
    const socket = io(url, socketOptions);
    
    const timeout = setTimeout(() => {
      log(`❌ Socket connection timeout: ${url}`, 'red');
      socket.close();
      resolve(false);
    }, 10000);
    
    socket.on('connect', () => {
      clearTimeout(timeout);
      log(`✅ Socket connected: ${socket.id}`, 'green');
      log(`   Transport: ${socket.io.engine.transport.name}`, 'blue');
      
      // Test authentication
      socket.emit('authenticate', {
        userId: 'test-user-123',
        username: 'TestUser',
        avatar: null
      });
      
      // Test ping
      socket.emit('ping');
    });
    
    socket.on('connected', (data) => {
      log(`✅ Server confirmation received: ${JSON.stringify(data)}`, 'green');
    });
    
    socket.on('authenticated', (data) => {
      log(`✅ Authentication successful: ${JSON.stringify(data)}`, 'green');
      socket.close();
      resolve(true);
    });
    
    socket.on('pong', (data) => {
      log(`✅ Ping response: ${JSON.stringify(data)}`, 'green');
    });
    
    socket.on('connect_error', (error) => {
      clearTimeout(timeout);
      log(`❌ Socket connection error: ${error.message}`, 'red');
      if (error.description) {
        log(`   Details: ${error.description}`, 'red');
      }
      if (error.context) {
        log(`   Context: ${JSON.stringify(error.context)}`, 'red');
      }
      socket.close();
      resolve(false);
    });
    
    socket.on('disconnect', (reason) => {
      log(`🔌 Socket disconnected: ${reason}`, 'yellow');
    });
    
    socket.on('error', (error) => {
      log(`❌ Socket error: ${JSON.stringify(error)}`, 'red');
    });
  });
}

// Check environment variables
function checkEnvironment() {
  log('\n🔍 Checking environment variables...', 'blue');
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optionalVars = [
    'FRONTEND_URL',
    'CLIENT_URL', 
    'VITE_APP_URL',
    'API_URL',
    'NODE_ENV'
  ];
  
  let missingRequired = 0;
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName} is set`, 'green');
    } else {
      log(`❌ Missing required variable: ${varName}`, 'red');
      missingRequired++;
    }
  });
  
  // Check optional variables
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      log(`✅ ${varName} = ${process.env[varName]}`, 'green');
    } else {
      log(`⚠️  Optional variable not set: ${varName}`, 'yellow');
    }
  });
  
  return missingRequired === 0;
}

// Main testing function
async function runTests() {
  log('🧪 Fan Club Z WebSocket CORS Testing', 'blue');
  log('===================================\n', 'blue');
  
  // Check environment
  const envOk = checkEnvironment();
  if (!envOk) {
    log('\n⚠️  Some required environment variables are missing!', 'yellow');
  }
  
  // Test URLs and origins
  const testUrls = [
    'http://localhost:3001',
    'https://dev.fanclubz.app',
    'https://fanclubz.app'
  ];
  
  const testOrigins = [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://dev.fanclubz.app',
    'https://fanclubz.app'
  ];
  
  log('\n🌐 Testing server endpoints...', 'blue');
  
  for (const url of testUrls) {
    log(`\n📡 Testing: ${url}`, 'yellow');
    
    // Test HTTP first
    const httpOk = await testHttpEndpoint(url);
    
    if (httpOk) {
      // Test WebSocket without origin
      await testSocketConnection(url);
      
      // Test WebSocket with different origins
      for (const origin of testOrigins) {
        await testSocketConnection(url, origin);
      }
    }
  }
  
  log('\n🎯 Testing Summary:', 'blue');
  log('1. If HTTP endpoints are accessible but WebSocket fails, check CORS configuration', 'blue');
  log('2. If all tests fail, ensure your server is running on the correct port', 'blue');  
  log('3. Check browser developer console for additional error details', 'blue');
  log('4. Verify that your hosting platform supports WebSocket connections', 'blue');
  
  log('\n✅ Testing complete!', 'green');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Fan Club Z WebSocket Testing Utility

Usage: node test-websocket-connection.js [options]

Options:
  --help, -h     Show this help message
  --env          Check environment variables only
  --url <url>    Test specific URL only

Examples:
  node test-websocket-connection.js
  node test-websocket-connection.js --env
  node test-websocket-connection.js --url http://localhost:3001
`);
  process.exit(0);
}

if (args.includes('--env')) {
  checkEnvironment();
  process.exit(0);
}

const urlIndex = args.indexOf('--url');
if (urlIndex !== -1 && args[urlIndex + 1]) {
  const testUrl = args[urlIndex + 1];
  (async () => {
    log(`Testing specific URL: ${testUrl}`, 'blue');
    await testHttpEndpoint(testUrl);
    await testSocketConnection(testUrl);
  })();
} else {
  runTests().catch(console.error);
}