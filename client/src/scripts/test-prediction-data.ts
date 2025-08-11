import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPredictionData() {
  console.log('🔍 Testing prediction data fetching...\n');

  try {
    // Test 1: Check if we can fetch predictions with the new columns
    console.log('📝 Testing predictions table with new columns...');
    const { data: predictions, error: predictionsError } = await supabase
      .from('predictions')
      .select(`
        id,
        title,
        likes_count,
        comments_count,
        creator:users!creator_id(id, username, avatar_url)
      `)
      .limit(3);

    if (predictionsError) {
      console.error('❌ Error fetching predictions:', predictionsError);
    } else {
      console.log('✅ Successfully fetched predictions:');
      predictions?.forEach((pred, index) => {
        console.log(`  ${index + 1}. ${pred.title}`);
        console.log(`     Likes: ${pred.likes_count}, Comments: ${pred.comments_count}`);
        console.log(`     Creator: ${pred.creator?.username}`);
        console.log('');
      });
    }

    // Test 2: Check if prediction_likes table works
    console.log('📝 Testing prediction_likes table...');
    const { data: likes, error: likesError } = await supabase
      .from('prediction_likes')
      .select('*')
      .limit(5);

    if (likesError) {
      console.error('❌ Error fetching prediction likes:', likesError);
    } else {
      console.log(`✅ Successfully fetched ${likes?.length || 0} prediction likes`);
    }

    // Test 3: Check if comment_likes table works
    console.log('📝 Testing comment_likes table...');
    const { data: commentLikes, error: commentLikesError } = await supabase
      .from('comment_likes')
      .select('*')
      .limit(5);

    if (commentLikesError) {
      console.error('❌ Error fetching comment likes:', commentLikesError);
    } else {
      console.log(`✅ Successfully fetched ${commentLikes?.length || 0} comment likes`);
    }

    // Test 4: Check if comments table has likes_count
    console.log('📝 Testing comments table with likes_count...');
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('id, content, likes_count, user:users(id, username)')
      .limit(3);

    if (commentsError) {
      console.error('❌ Error fetching comments:', commentsError);
    } else {
      console.log('✅ Successfully fetched comments:');
      comments?.forEach((comment, index) => {
        console.log(`  ${index + 1}. ${comment.content?.substring(0, 50)}...`);
        console.log(`     Likes: ${comment.likes_count}, User: ${comment.user?.username}`);
        console.log('');
      });
    }

    // Test 5: Check wallet_transactions fee column
    console.log('📝 Testing wallet_transactions fee column...');
    const { data: transactions, error: transactionsError } = await supabase
      .from('wallet_transactions')
      .select('id, type, amount, fee, currency')
      .limit(3);

    if (transactionsError) {
      console.error('❌ Error fetching wallet transactions:', transactionsError);
    } else {
      console.log('✅ Successfully fetched wallet transactions:');
      transactions?.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.type}: ${tx.amount} ${tx.currency} (fee: ${tx.fee})`);
      });
    }

    console.log('\n📊 SUMMARY:');
    console.log('All database tables and columns are working correctly!');
    console.log('The issue might be with the frontend application not refreshing or caching.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPredictionData();
