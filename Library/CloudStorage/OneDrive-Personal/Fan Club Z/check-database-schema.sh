#!/bin/bash

echo "🗄️ Checking and fixing database schema..."

cd "/Users/efe/Library/CloudStorage/OneDrive-Personal/Fan Club Z/server"

# Check if comments table exists and has correct schema
echo "🔍 Checking comments table schema..."

# Run a quick test to see if the table structure is correct
node -e "
const knex = require('knex');
const config = require('./dist/server/src/database/config.js').default;

async function checkSchema() {
  try {
    const db = knex(config);
    
    // Check if comments table exists
    const hasTable = await db.schema.hasTable('comments');
    console.log('Comments table exists:', hasTable);
    
    if (hasTable) {
      // Check column info
      const columns = await db('comments').columnInfo();
      console.log('Columns:', Object.keys(columns));
      
      // Check if likes_count column exists
      if (columns.likes_count) {
        console.log('✅ likes_count column exists');
      } else if (columns.likes) {
        console.log('⚠️ Found likes column instead of likes_count');
      } else {
        console.log('❌ No likes column found');
      }
    }
    
    await db.destroy();
  } catch (error) {
    console.error('Schema check error:', error.message);
  }
}

checkSchema();
"

echo ""
echo "🔧 If there were schema issues above, the TypeScript fixes will handle the mapping."
echo "✅ Database schema check complete."
