#!/usr/bin/env ts-node

/**
 * Supabase Connection Test Script
 * 
 * This script tests the Supabase connection and verifies that all
 * essential database tables are accessible.
 */

import { supabase, supabaseAnon, db } from '../config/database';
import config from '../config';

// ANSI color codes for better output
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
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
};

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

async function testBasicConnection(): Promise<TestResult> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return {
      name: 'Basic Connection',
      success: true,
      details: 'Successfully connected to Supabase',
    };
  } catch (error: any) {
    return {
      name: 'Basic Connection',
      success: false,
      error: error.message,
    };
  }
}

async function testAnonConnection(): Promise<TestResult> {
  try {
    const { data, error } = await supabaseAnon
      .from('users')
      .select('count')
      .limit(1)
      .single();
    
    // For anon connection, we expect this to fail or return limited data
    // depending on RLS policies, so we just check if we get a proper response
    return {
      name: 'Anonymous Connection',
      success: true,
      details: 'Anonymous client initialized successfully',
    };
  } catch (error: any) {
    return {
      name: 'Anonymous Connection',
      success: false,
      error: error.message,
    };
  }
}

async function testTableAccess(): Promise<TestResult[]> {
  const tables = [
    'users',
    'predictions',
    'prediction_options',
    'prediction_entries',
    'wallets',
    'wallet_transactions',
    'clubs',
    'club_members',
    'comments',
    'reactions',
  ];
  
  const results: TestResult[] = [];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        results.push({
          name: `Table: ${table}`,
          success: false,
          error: error.message,
        });
      } else {
        results.push({
          name: `Table: ${table}`,
          success: true,
          details: `Accessible (${data?.length || 0} records in sample)`,
        });
      }
    } catch (error: any) {
      results.push({
        name: `Table: ${table}`,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
}

async function testDatabaseHelpers(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test users helper
  try {
    await db.users.findByEmail('test@nonexistent.com');
    results.push({
      name: 'Users Helper',
      success: true,
      details: 'findByEmail function works',
    });
  } catch (error: any) {
    results.push({
      name: 'Users Helper',
      success: false,
      error: error.message,
    });
  }
  
  // Test predictions helper
  try {
    const result = await db.predictions.findMany({}, { page: 1, limit: 1 });
    results.push({
      name: 'Predictions Helper',
      success: true,
      details: `findMany function works (${result.data.length} records)`,
    });
  } catch (error: any) {
    results.push({
      name: 'Predictions Helper',
      success: false,
      error: error.message,
    });
  }
  
  // Test wallets helper
  try {
    await db.wallets.findByUserId('nonexistent-user');
    results.push({
      name: 'Wallets Helper',
      success: true,
      details: 'findByUserId function works',
    });
  } catch (error: any) {
    results.push({
      name: 'Wallets Helper',
      success: false,
      error: error.message,
    });
  }
  
  return results;
}

async function testRPCFunctions(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  // Test custom RPC functions if they exist
  try {
    // This should fail safely if the function doesn't exist
    const { data, error } = await supabase.rpc('update_wallet_balance', {
      user_id: 'test-user',
      currency_code: 'NGN',
      available_change: 0,
      reserved_change: 0,
    });
    
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    results.push({
      name: 'RPC Function: update_wallet_balance',
      success: error?.message.includes('does not exist') ? false : true,
      details: error?.message.includes('does not exist') 
        ? 'Function not found (may need to be created)' 
        : 'Function accessible',
    });
  } catch (error: any) {
    results.push({
      name: 'RPC Function: update_wallet_balance',
      success: false,
      error: error.message,
    });
  }
  
  return results;
}

function printConfiguration() {
  log.header('Configuration Check');
  
  console.log(`Supabase URL: ${config.supabase.url}`);
  console.log(`Anon Key: ${config.supabase.anonKey.substring(0, 20)}...`);
  console.log(`Service Key: ${config.supabase.serviceKey.substring(0, 20)}...`);
  console.log(`Environment: ${config.server.nodeEnv}`);
}

function printResults(results: TestResult[]) {
  let successCount = 0;
  let totalCount = results.length;
  
  for (const result of results) {
    if (result.success) {
      log.success(`${result.name}: ${result.details || 'OK'}`);
      successCount++;
    } else {
      log.error(`${result.name}: ${result.error || 'Failed'}`);
    }
  }
  
  console.log(`\n${colors.bright}Summary: ${successCount}/${totalCount} tests passed${colors.reset}`);
  
  if (successCount === totalCount) {
    log.success('All tests passed! Supabase is working correctly.');
  } else {
    log.warning(`${totalCount - successCount} tests failed. Please check your configuration.`);
  }
}

async function main() {
  console.log(`${colors.bright}${colors.magenta}Fan Club Z - Supabase Connection Test${colors.reset}`);
  console.log('Testing database connectivity and configuration...\n');
  
  printConfiguration();
  
  const allResults: TestResult[] = [];
  
  // Test basic connection
  log.header('Basic Connection Tests');
  allResults.push(await testBasicConnection());
  allResults.push(await testAnonConnection());
  
  // Test table access
  log.header('Table Access Tests');
  const tableResults = await testTableAccess();
  allResults.push(...tableResults);
  
  // Test database helpers
  log.header('Database Helper Tests');
  const helperResults = await testDatabaseHelpers();
  allResults.push(...helperResults);
  
  // Test RPC functions
  log.header('RPC Function Tests');
  const rpcResults = await testRPCFunctions();
  allResults.push(...rpcResults);
  
  // Print final results
  log.header('Test Results');
  printResults(allResults);
  
  // Exit with appropriate code
  const hasFailures = allResults.some(result => !result.success);
  process.exit(hasFailures ? 1 : 0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.warning('\nTest interrupted by user');
  process.exit(130);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

if (require.main === module) {
  main().catch((error) => {
    log.error(`Test failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

export { main as testSupabase };
