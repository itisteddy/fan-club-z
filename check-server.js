#!/usr/bin/env node

/**
 * Quick server health check
 */

const http = require('http');

const checkServer = (port, path = '/health') => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

async function main() {
  console.log('🔍 Checking server status...\n');

  // Check server health
  try {
    const health = await checkServer(3001, '/health');
    console.log('✅ Server Health Check:', health.status);
    console.log('📋 Response:', JSON.stringify(JSON.parse(health.data), null, 2));
  } catch (error) {
    console.log('❌ Server Health Check Failed:', error.message);
  }

  console.log('');

  // Check API health
  try {
    const apiHealth = await checkServer(3001, '/api/health');
    console.log('✅ API Health Check:', apiHealth.status);
    console.log('📋 Response:', JSON.stringify(JSON.parse(apiHealth.data), null, 2));
  } catch (error) {
    console.log('❌ API Health Check Failed:', error.message);
  }

  console.log('');

  // Check if clubs endpoint exists
  try {
    const clubsCheck = await checkServer(3001, '/api/v2/clubs');
    console.log('✅ Clubs Endpoint Check:', clubsCheck.status);
    if (clubsCheck.status === 401) {
      console.log('📋 Response: Authentication required (expected)');
    } else {
      console.log('📋 Response:', clubsCheck.data.substring(0, 200) + '...');
    }
  } catch (error) {
    console.log('❌ Clubs Endpoint Check Failed:', error.message);
  }
}

main().catch(console.error);
