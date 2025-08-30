"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
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
async function fixDatabaseDirect() {
    console.log('🔧 Fixing database schema using direct SQL...\n');
    try {
        // 1. Add missing columns to predictions table
        console.log('📝 Adding likes_count and comments_count to predictions table...');
        const { error: predictionsError } = await supabase
            .from('predictions')
            .select('id')
            .limit(1);
        if (predictionsError) {
            console.error('❌ Error accessing predictions table:', predictionsError);
        }
        else {
            console.log('✅ Predictions table is accessible');
        }
        // 2. Check if columns exist by trying to select them
        console.log('📝 Checking if likes_count and comments_count columns exist...');
        const { data: testData, error: testError } = await supabase
            .from('predictions')
            .select('id, likes_count, comments_count')
            .limit(1);
        if (testError && testError.message.includes('does not exist')) {
            console.log('❌ Missing columns detected. You need to run this SQL in Supabase SQL Editor:');
            console.log(`
-- Add missing columns to predictions table
ALTER TABLE predictions 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

-- Add fee column to wallet_transactions table
ALTER TABLE wallet_transactions 
ADD COLUMN IF NOT EXISTS fee DECIMAL(18,8) DEFAULT 0.00000000;

-- Create prediction_likes table
CREATE TABLE IF NOT EXISTS prediction_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prediction_id, user_id)
);

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Add likes_count to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_predictions_likes_count ON predictions(likes_count);
CREATE INDEX IF NOT EXISTS idx_predictions_comments_count ON predictions(comments_count);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_fee ON wallet_transactions(fee);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_prediction_id ON prediction_likes(prediction_id);
CREATE INDEX IF NOT EXISTS idx_prediction_likes_user_id ON prediction_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Enable RLS
ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all prediction likes" ON prediction_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like predictions" ON prediction_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes" ON prediction_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view all comment likes" ON comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like comments" ON comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own comment likes" ON comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON prediction_likes TO authenticated;
GRANT ALL ON comment_likes TO authenticated;
      `);
        }
        else if (testError) {
            console.error('❌ Error testing columns:', testError);
        }
        else {
            console.log('✅ Columns already exist');
        }
        // 3. Test wallet_transactions table
        console.log('📝 Testing wallet_transactions table...');
        const { error: walletError } = await supabase
            .from('wallet_transactions')
            .select('id, fee')
            .limit(1);
        if (walletError && walletError.message.includes('does not exist')) {
            console.log('❌ Fee column missing in wallet_transactions table');
        }
        else if (walletError) {
            console.error('❌ Error testing wallet_transactions:', walletError);
        }
        else {
            console.log('✅ Wallet transactions table is accessible');
        }
        // 4. Test prediction_likes table
        console.log('📝 Testing prediction_likes table...');
        const { error: likesError } = await supabase
            .from('prediction_likes')
            .select('id')
            .limit(1);
        if (likesError && likesError.message.includes('does not exist')) {
            console.log('❌ prediction_likes table does not exist');
        }
        else if (likesError) {
            console.error('❌ Error testing prediction_likes:', likesError);
        }
        else {
            console.log('✅ prediction_likes table exists');
        }
        // 5. Test comment_likes table
        console.log('📝 Testing comment_likes table...');
        const { error: commentLikesError } = await supabase
            .from('comment_likes')
            .select('id')
            .limit(1);
        if (commentLikesError && commentLikesError.message.includes('does not exist')) {
            console.log('❌ comment_likes table does not exist');
        }
        else if (commentLikesError) {
            console.error('❌ Error testing comment_likes:', commentLikesError);
        }
        else {
            console.log('✅ comment_likes table exists');
        }
        console.log('\n📋 SUMMARY:');
        console.log('The database schema needs to be updated. Please run the SQL commands above in your Supabase SQL Editor.');
        console.log('\n🔗 Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/sql');
        console.log('Then paste and execute the SQL commands shown above.');
    }
    catch (error) {
        console.error('❌ Database check failed:', error);
    }
}
// Run the check
fixDatabaseDirect();
