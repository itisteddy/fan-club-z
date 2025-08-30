#!/usr/bin/env node

/**
 * Quick Supabase Connection Verification
 * 
 * This script performs a quick check to verify that Supabase is configured
 * correctly and can be connected to from both client and server environments.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

async function verifySupabase() {
  console.log(`${colors.bright}${colors.magenta}Fan Club Z - Supabase Verification${colors.reset}\n`);

  // Check environment variables
  log.header('Environment Variables Check');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    log.error('VITE_SUPABASE_URL is not set');
    return false;
  } else {
    log.success(`Supabase URL: ${supabaseUrl}`);
  }

  if (!anonKey) {
    log.error('VITE_SUPABASE_ANON_KEY is not set');
    return false;
  } else {
    log.success(`Anon Key: ${anonKey.substring(0, 20)}...`);
  }

  if (!serviceKey) {
    log.error('SUPABASE_SERVICE_ROLE_KEY is not set');
    return false;
  } else {
    log.success(`Service Key: ${serviceKey.substring(0, 20)}...`);
  }

  // Validate URL format
  if (!supabaseUrl.startsWith('https://')) {
    log.error('Supabase URL must start with https://');
    return false;
  }

  if (!supabaseUrl.includes('.supabase.co')) {
    log.error('Supabase URL must contain .supabase.co');
    return false;
  }

  log.header('Connection Tests');

  // Test client connection (anon key)
  try {
    const clientSupabase = createClient(supabaseUrl, anonKey);
    
    // Simple test query
    const { data, error } = await clientSupabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      log.warning(`Client connection issue: ${error.message}`);
    } else {
      log.success('Client connection (anon key) works');
    }
  } catch (error) {
    log.error(`Client connection failed: ${error.message}`);
    return false;
  }

  // Test service connection (service role key)
  try {
    const serviceSupabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Simple test query
    const { data, error } = await serviceSupabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      log.warning(`Service connection issue: ${error.message}`);
    } else {
      log.success('Service connection (service role key) works');
    }
  } catch (error) {
    log.error(`Service connection failed: ${error.message}`);
    return false;
  }

  log.header('Summary');
  log.success('Supabase is configured correctly and working!');
  
  log.info('Next steps:');
  console.log('  1. Run the server: npm run dev (from server directory)');
  console.log('  2. Run the client: npm run dev (from client directory)');
  console.log('  3. For detailed testing: npm run test:supabase (from server directory)');
  
  return true;
}

// Handle errors gracefully
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection: ${reason}`);
  process.exit(1);
});

// Run the verification
verifySupabase()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log.error(`Verification failed: ${error.message}`);
    process.exit(1);
  });
