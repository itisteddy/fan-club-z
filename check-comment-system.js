#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkCommentSystem() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials in environment');
    console.log('VITE_SUPABASE_URL:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check if comments table exists
    console.log('🔍 Checking comment system database tables...\n');

    // Check comments table
    const { data: commentsCheck, error: commentsError } = await supabase
      .from('comments')
      .select('id')
      .limit(1);

    if (commentsError) {
      console.log('❌ Comments table does not exist');
      console.log('Error:', commentsError.message);
      console.log('\n🛠️  Need to run database migration!');
      console.log('Run this command to set up the comment system:');
      console.log('chmod +x setup-comment-system.sh && ./setup-comment-system.sh');
      return;
    } else {
      console.log('✅ Comments table exists');
    }

    // Check comment_likes table
    const { data: likesCheck, error: likesError } = await supabase
      .from('comment_likes')
      .select('id')
      .limit(1);

    if (likesError) {
      console.log('❌ Comment_likes table does not exist');
      console.log('Error:', likesError.message);
    } else {
      console.log('✅ Comment_likes table exists');
    }

    // Check if predictions table has comments_count column
    const { data: predictionsCheck, error: predictionsError } = await supabase
      .from('predictions')
      .select('id, comments_count')
      .limit(1);

    if (predictionsError) {
      console.log('❌ Predictions table missing comments_count column');
      console.log('Error:', predictionsError.message);
    } else {
      console.log('✅ Predictions table has comments_count column');
    }

    // Test the comment system by fetching comments for a prediction
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id, title')
      .limit(1);

    if (predictions && predictions.length > 0) {
      const predictionId = predictions[0].id;
      console.log(`\n🔍 Testing comment system with prediction: "${predictions[0].title}"`);
      
      const { data: comments, error: commentsTestError } = await supabase
        .from('comments')
        .select(`
          *,
          user:users!user_id (
            id,
            username,
            avatar_url,
            is_verified
          )
        `)
        .eq('prediction_id', predictionId)
        .limit(5);

      if (commentsTestError) {
        console.log('❌ Error fetching comments:', commentsTestError.message);
      } else {
        console.log(`✅ Found ${comments.length} comments for this prediction`);
        if (comments.length > 0) {
          console.log('📝 Sample comment:', comments[0].content);
        }
      }
    }

    console.log('\n🎉 Comment system database check complete!');
    console.log('\n💡 If you see any ❌ errors above, run:');
    console.log('   chmod +x setup-comment-system.sh && ./setup-comment-system.sh');

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
}

checkCommentSystem().catch(console.error);
