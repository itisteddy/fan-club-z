import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabase() {
  console.log('🔧 Fixing database schema...\n');

  try {
    // 1. Add missing columns to predictions table
    console.log('📝 Adding likes_count and comments_count to predictions table...');
    const { error: predictionsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE predictions 
        ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
      `
    });

    if (predictionsError) {
      console.error('❌ Failed to add columns to predictions table:', predictionsError);
    } else {
      console.log('✅ Added columns to predictions table');
    }

    // 2. Add fee column to wallet_transactions table
    console.log('📝 Adding fee column to wallet_transactions table...');
    const { error: walletError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE wallet_transactions 
        ADD COLUMN IF NOT EXISTS fee DECIMAL(18,8) DEFAULT 0.00000000;
      `
    });

    if (walletError) {
      console.error('❌ Failed to add fee column to wallet_transactions table:', walletError);
    } else {
      console.log('✅ Added fee column to wallet_transactions table');
    }

    // 3. Create prediction_likes table
    console.log('📝 Creating prediction_likes table...');
    const { error: predictionLikesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS prediction_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(prediction_id, user_id)
        );
      `
    });

    if (predictionLikesError) {
      console.error('❌ Failed to create prediction_likes table:', predictionLikesError);
    } else {
      console.log('✅ Created prediction_likes table');
    }

    // 4. Create comment_likes table
    console.log('📝 Creating comment_likes table...');
    const { error: commentLikesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS comment_likes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(comment_id, user_id)
        );
      `
    });

    if (commentLikesError) {
      console.error('❌ Failed to create comment_likes table:', commentLikesError);
    } else {
      console.log('✅ Created comment_likes table');
    }

    // 5. Add likes_count to comments table
    console.log('📝 Adding likes_count to comments table...');
    const { error: commentsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE comments 
        ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
      `
    });

    if (commentsError) {
      console.error('❌ Failed to add likes_count to comments table:', commentsError);
    } else {
      console.log('✅ Added likes_count to comments table');
    }

    // 6. Create indexes
    console.log('📝 Creating indexes...');
    const { error: indexesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_predictions_likes_count ON predictions(likes_count);
        CREATE INDEX IF NOT EXISTS idx_predictions_comments_count ON predictions(comments_count);
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_fee ON wallet_transactions(fee);
        CREATE INDEX IF NOT EXISTS idx_prediction_likes_prediction_id ON prediction_likes(prediction_id);
        CREATE INDEX IF NOT EXISTS idx_prediction_likes_user_id ON prediction_likes(user_id);
        CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
      `
    });

    if (indexesError) {
      console.error('❌ Failed to create indexes:', indexesError);
    } else {
      console.log('✅ Created indexes');
    }

    // 7. Enable RLS and create policies
    console.log('📝 Setting up RLS policies...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE prediction_likes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view all prediction likes" ON prediction_likes;
        CREATE POLICY "Users can view all prediction likes" ON prediction_likes
          FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Users can like predictions" ON prediction_likes;
        CREATE POLICY "Users can like predictions" ON prediction_likes
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can unlike their own likes" ON prediction_likes;
        CREATE POLICY "Users can unlike their own likes" ON prediction_likes
          FOR DELETE USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
        CREATE POLICY "Users can view all comment likes" ON comment_likes
          FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
        CREATE POLICY "Users can like comments" ON comment_likes
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can unlike their own comment likes" ON comment_likes;
        CREATE POLICY "Users can unlike their own comment likes" ON comment_likes
          FOR DELETE USING (auth.uid() = user_id);
      `
    });

    if (rlsError) {
      console.error('❌ Failed to set up RLS policies:', rlsError);
    } else {
      console.log('✅ Set up RLS policies');
    }

    // 8. Grant permissions
    console.log('📝 Granting permissions...');
    const { error: grantError } = await supabase.rpc('exec_sql', {
      sql: `
        GRANT ALL ON prediction_likes TO authenticated;
        GRANT ALL ON comment_likes TO authenticated;
      `
    });

    if (grantError) {
      console.error('❌ Failed to grant permissions:', grantError);
    } else {
      console.log('✅ Granted permissions');
    }

    console.log('\n✅ Database schema fix completed successfully!');
    console.log('\n📊 Summary of changes:');
    console.log('   • Added likes_count and comments_count to predictions table');
    console.log('   • Added fee column to wallet_transactions table');
    console.log('   • Created prediction_likes table');
    console.log('   • Created comment_likes table');
    console.log('   • Added likes_count to comments table');
    console.log('   • Created necessary indexes');
    console.log('   • Set up RLS policies');
    console.log('   • Granted necessary permissions');

  } catch (error) {
    console.error('❌ Database fix failed:', error);
  }
}

// Run the fix
fixDatabase();
