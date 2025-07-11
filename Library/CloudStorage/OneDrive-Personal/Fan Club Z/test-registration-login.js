#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'http://localhost:5001/api';
const random = Math.floor(Math.random() * 1000000);
const testUser = {
  firstName: 'Test',
  lastName: 'User',
  username: `testuser${random}`,
  email: `testuser${random}@fanclubz.app`,
  phone: '+1 555-123-4567',
  dateOfBirth: '2000-01-01',
  password: 'TestPassword1!'
};

async function main() {
  console.log('--- Fan Club Z Registration/Login Test ---');
  // 1. Register
  let registerRes = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(testUser)
  });
  let registerData = await registerRes.json();
  if (!registerRes.ok || !registerData.success) {
    console.error('❌ Registration failed:', registerData.error || registerData);
    process.exit(1);
  }
  console.log('✅ Registration succeeded:', registerData.data.user.email);

  // 2. Login
  let loginRes = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });
  let loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.success) {
    console.error('❌ Login failed:', loginData.error || loginData);
    process.exit(1);
  }
  if (!loginData.data.accessToken) {
    console.error('❌ Login did not return accessToken:', loginData);
    process.exit(1);
  }
  console.log('✅ Login succeeded, accessToken received.');
  console.log('--- All tests passed! ---');
}

main().catch(e => { console.error('❌ Test script error:', e); process.exit(1); }); 