#!/usr/bin/env node

/**
 * Quick test script to verify API endpoints are working
 * Run this from the terminal to test the likes and comments API
 */

const API_BASE = 'https://fan-club-z.onrender.com';
const TEST_PREDICTION_ID = 'd7d1ac22-de45-4931-8ea8-611bfa5e9649';

async function testAPI() {
  console.log('🧪 Testing Fan Club Z API endpoints...\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    const data = await response.json();
    console.log('✅ Health check:', response.status, data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Prediction like
  console.log('\n2. Testing prediction like...');
  try {
    const response = await fetch(`${API_BASE}/api/v2/predictions/${TEST_PREDICTION_ID}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log('✅ Prediction like:', response.status, data);
  } catch (error) {
    console.log('❌ Prediction like failed:', error.message);
  }

  // Test 3: Get prediction likes
  console.log('\n3. Testing get prediction likes...');
  try {
    const response = await fetch(`${API_BASE}/api/v2/predictions/${TEST_PREDICTION_ID}/likes`);
    const data = await response.json();
    console.log('✅ Get likes:', response.status, data);
  } catch (error) {
    console.log('❌ Get likes failed:', error.message);
  }

  // Test 4: Get comments
  console.log('\n4. Testing get comments...');
  try {
    const response = await fetch(`${API_BASE}/api/v2/predictions/${TEST_PREDICTION_ID}/comments`);
    const data = await response.json();
    console.log('✅ Get comments:', response.status, data.success ? `${data.comments?.length || 0} comments` : data);
  } catch (error) {
    console.log('❌ Get comments failed:', error.message);
  }

  // Test 5: Add comment
  console.log('\n5. Testing add comment...');
  try {
    const response = await fetch(`${API_BASE}/api/v2/predictions/${TEST_PREDICTION_ID}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Test comment from API test script - ${new Date().toLocaleTimeString()}`
      })
    });
    const data = await response.json();
    console.log('✅ Add comment:', response.status, data.content ? 'Comment created' : data);
  } catch (error) {
    console.log('❌ Add comment failed:', error.message);
  }

  console.log('\n🎉 API test complete!');
  console.log('\n📋 Summary:');
  console.log('- If you see ✅ for most tests, the API is working');
  console.log('- If you see ❌ for most tests, check server logs');
  console.log('- The frontend should now show real like/comment counts');
}

testAPI().catch(console.error);
