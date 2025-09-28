#!/usr/bin/env ts-node
import { envServer } from "../client/src/config/env.server";

console.log('🔍 Environment Variables Check');
console.log('==============================');

console.log('\n📋 Server Environment:');
console.log('[env:server]', Object.keys(envServer));

// Check for required variables in production
if (process.env.NODE_ENV === 'production') {
  const required = ['SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('\n❌ Missing required production variables:', missing);
    process.exit(1);
  } else {
    console.log('\n✅ All required production variables present');
  }
}

console.log('\n✅ Environment check complete');
