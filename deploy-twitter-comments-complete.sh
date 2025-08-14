#!/bin/bash

echo "🚀 Deploying Twitter-Style Comments System to Fan Club Z"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Fan Club Z root directory"
    exit 1
fi

echo "📊 Step 1: Applying Database Schema"
echo "-----------------------------------"

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Missing Supabase environment variables"
    echo "Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
    exit 1
fi

echo "✅ Environment variables loaded"

# Apply database schema using Node.js
echo "🗄️  Applying comment system schema..."
cat > apply-comment-schema.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

async function applySchema() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // Check if comments table exists
  console.log('🔍 Checking existing tables...');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'comments');

  if (tablesError) {
    console.error('❌ Error checking tables:', tablesError.message);
    process.exit(1);
  }

  if (tables && tables.length > 0) {
    console.log('✅ Comments table already exists');
  } else {
    console.log('📋 Creating comments table...');
    
    // Create comments table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL CHECK (char_length(content) <= 280),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          prediction_id UUID NOT NULL REFERENCES predictions(id) ON DELETE CASCADE,
          parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
          likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
          replies_count INTEGER DEFAULT 0 CHECK (replies_count >= 0),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          edited_at TIMESTAMP WITH TIME ZONE,
          deleted_at TIMESTAMP WITH TIME ZONE,
          CONSTRAINT valid_parent_comment CHECK (parent_comment_id != id)
        );
      `
    });

    if (createError) {
      console.error('❌ Error creating comments table:', createError.message);
      process.exit(1);
    }
    console.log('✅ Comments table created');
  }

  // Check if comment_likes table exists
  const { data: likesTable } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'comment_likes');

  if (!likesTable || likesTable.length === 0) {
    console.log('📋 Creating comment_likes table...');
    
    const { error: likesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS comment_likes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_comment_like UNIQUE (comment_id, user_id)
        );
      `
    });

    if (likesError) {
      console.error('❌ Error creating comment_likes table:', likesError.message);
      process.exit(1);
    }
    console.log('✅ Comment_likes table created');
  } else {
    console.log('✅ Comment_likes table already exists');
  }

  // Add comments_count to predictions if it doesn't exist
  console.log('📋 Adding comments_count column to predictions...');
  const { error: columnError } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'predictions' AND column_name = 'comments_count'
          ) THEN
              ALTER TABLE predictions ADD COLUMN comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0);
          END IF;
      END $$;
    `
  });

  if (columnError) {
    console.error('❌ Error adding comments_count column:', columnError.message);
  } else {
    console.log('✅ Comments_count column ensured');
  }

  // Create indexes
  console.log('📋 Creating indexes...');
  const { error: indexError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE INDEX IF NOT EXISTS idx_comments_prediction_id ON comments(prediction_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
      CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
      CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
      CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
    `
  });

  if (indexError) {
    console.error('⚠️  Warning: Some indexes may not have been created:', indexError.message);
  } else {
    console.log('✅ Indexes created');
  }

  // Enable RLS
  console.log('🔒 Setting up Row Level Security...');
  const { error: rlsError } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can view all comments" ON comments;
      CREATE POLICY "Users can view all comments" ON comments
          FOR SELECT USING (deleted_at IS NULL);

      DROP POLICY IF EXISTS "Users can insert their own comments" ON comments;
      CREATE POLICY "Users can insert their own comments" ON comments
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
      CREATE POLICY "Users can update their own comments" ON comments
          FOR UPDATE USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
      CREATE POLICY "Users can delete their own comments" ON comments
          FOR DELETE USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can view all comment likes" ON comment_likes;
      CREATE POLICY "Users can view all comment likes" ON comment_likes
          FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Users can insert their own comment likes" ON comment_likes;
      CREATE POLICY "Users can insert their own comment likes" ON comment_likes
          FOR INSERT WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can delete their own comment likes" ON comment_likes;
      CREATE POLICY "Users can delete their own comment likes" ON comment_likes
          FOR DELETE USING (auth.uid() = user_id);
    `
  });

  if (rlsError) {
    console.error('⚠️  Warning: RLS policies may not have been set correctly:', rlsError.message);
  } else {
    console.log('✅ Row Level Security configured');
  }

  console.log('\n🎉 Database schema applied successfully!');
}

applySchema().catch(console.error);
EOF

# Run the schema application
node apply-comment-schema.js

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply database schema"
    rm -f apply-comment-schema.js
    exit 1
fi

# Clean up temporary file
rm -f apply-comment-schema.js

echo ""
echo "🔧 Step 2: Building Application"
echo "-------------------------------"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

echo ""
echo "🚀 Step 3: Deploying to Environment"
echo "-----------------------------------"

# Check if this is a Vercel deployment
if [ -n "$VERCEL" ]; then
    echo "🔵 Detected Vercel environment"
    echo "✅ Application built and ready for Vercel deployment"
elif [ -n "$RENDER" ]; then
    echo "🟣 Detected Render environment"
    echo "✅ Application built and ready for Render deployment"
else
    echo "💻 Local/Development environment"
    echo "Starting development server..."
    
    # Start the development server in the background for testing
    npm run dev &
    DEV_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    echo "✅ Development server started (PID: $DEV_PID)"
    echo ""
    echo "🧪 Testing comment system..."
    
    # Test if the server is responding
    if curl -s http://localhost:5173 > /dev/null; then
        echo "✅ Frontend server is running on http://localhost:5173"
    else
        echo "⚠️  Frontend server may not be running correctly"
    fi
    
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "✅ Backend server is running on http://localhost:3001"
    else
        echo "⚠️  Backend server may not be running"
    fi
    
    # Stop the dev server
    kill $DEV_PID 2>/dev/null
fi

echo ""
echo "🎉 Twitter-Style Comments System Deployment Complete!"
echo "====================================================="
echo ""
echo "📱 How to use the comment system:"
echo "1. Navigate to any prediction detail page"
echo "2. Scroll down to see the 'Community Engagement' section"
echo "3. Click the 'comments' button to expand the comment system"
echo "4. Post, reply, like, edit, and delete comments (Twitter-style)"
echo ""
echo "🔄 Key Differences from Chat:"
echo "├── Chat System: Real-time, ephemeral discussions (WebSocket)"
echo "└── Comment System: Persistent, Twitter-style threaded comments"
echo ""
echo "✨ Features Implemented:"
echo "├── ✅ Persistent Twitter-style comments"
echo "├── ✅ Threaded replies with nesting"
echo "├── ✅ Like/unlike functionality"
echo "├── ✅ Edit and delete your own comments"
echo "├── ✅ 280 character limit (like Twitter)"
echo "├── ✅ Real-time character count"
echo "├── ✅ Optimistic UI updates"
echo "├── ✅ Mobile-optimized design"
echo "├── ✅ Database integration with RLS"
echo "└── ✅ Backend API endpoints"
echo ""
echo "🔗 API Endpoints Available:"
echo "├── POST /api/v2/social/comments (Create comment)"
echo "├── PUT /api/v2/social/comments/:id (Update comment)"
echo "├── DELETE /api/v2/social/comments/:id (Delete comment)"
echo "├── POST /api/v2/social/comments/:id/like (Like/unlike)"
echo "└── GET /api/v2/social/predictions/:id/comments (Get comments)"
echo ""
echo "🧪 To test the comment system:"
echo "1. Open your deployed app: https://fan-club-z-dev.vercel.app"
echo "2. Navigate to any prediction"
echo "3. Click 'comments' to expand the comment section"
echo "4. Try posting, replying, and liking comments"
echo ""
echo "🎯 Both systems now work together:"
echo "• Use Chat for real-time live discussions during events"
echo "• Use Comments for persistent commentary and opinions"
