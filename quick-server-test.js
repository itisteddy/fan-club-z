#!/usr/bin/env node

/**
 * Quick Server Test - Simple test to verify server can start
 * This bypasses TypeScript compilation and tests the environment setup
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from multiple possible locations
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '.env.local'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local')
];

console.log('🔧 Loading environment variables...');
envPaths.forEach(envPath => {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed) {
      console.log(`✅ Loaded environment from: ${envPath}`);
      console.log(`   Variables loaded: ${Object.keys(result.parsed).length}`);
    }
  } catch (error) {
    console.log(`⚠️ Could not load environment from: ${envPath}`);
  }
});

// Debug environment variables
console.log('\n🔍 Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Present' : 'Missing');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Present' : 'Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Present' : 'Missing');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Simple server test successful',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
      vite_supabase_configured: !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API working',
    supabase_check: {
      url_available: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
      key_available: !!process.env.SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_ANON_KEY
    }
  });
});

// Test Supabase configuration
app.get('/api/test-supabase', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      success: false,
      error: 'Supabase environment variables not configured',
      details: {
        url_available: !!supabaseUrl,
        key_available: !!supabaseKey,
        available_env_vars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
      }
    });
  }
  
  res.json({
    success: true,
    message: 'Supabase configuration looks good',
    url: supabaseUrl ? 'Present' : 'Missing',
    key: supabaseKey ? 'Present' : 'Missing'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Quick Server Test started on port ${PORT}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Test URLs:`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API Health: http://localhost:${PORT}/api/health`);
  console.log(`   Supabase Test: http://localhost:${PORT}/api/test-supabase`);
  console.log(`\n✅ If you see this message, the basic server setup is working!`);
  console.log(`📝 Check the health endpoints to verify configuration.`);
});
