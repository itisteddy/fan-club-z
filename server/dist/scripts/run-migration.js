"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
}
// Create Supabase client with service role key for admin access
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
async function runMigration() {
    console.log('🔧 Running database migration to add missing columns...\n');
    try {
        // Read the migration SQL file
        const migrationPath = path_1.default.join(__dirname, 'add-missing-columns.sql');
        const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf8');
        console.log('📝 Executing migration SQL...');
        // Execute the migration
        const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        if (error) {
            console.error('❌ Migration failed:', error);
            return;
        }
        console.log('✅ Migration completed successfully!');
        console.log('\n📊 Added the following:');
        console.log('   • likes_count column to predictions table');
        console.log('   • comments_count column to predictions table');
        console.log('   • fee column to wallet_transactions table');
        console.log('   • prediction_likes table');
        console.log('   • comment_likes table');
        console.log('   • Automatic triggers for count updates');
        console.log('   • RLS policies for new tables');
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
    }
}
// Run the migration
runMigration();
