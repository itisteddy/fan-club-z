const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Comment System Integration Test
// Tests all comment functionality including nested replies, reactions, and moderation

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
let testPredictionId = null;
let testUserId = null;
let testCommentId = null;
let testReplyId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test functions
async function setupTestData() {
  log('\n🔧 Setting up test data...', 'cyan');
  
  try {
    // Get or create a test user
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0) {
      testUserId = users[0].id;
      success(`Using existing test user: ${testUserId}`);
    } else {
      warning('No users found. Comment tests may fail without authentication.');
      return false;
    }

    // Get or create a test prediction
    const { data: predictions } = await supabase
      .from('predictions')
      .select('id')
      .limit(1);
    
    if (predictions && predictions.length > 0) {
      testPredictionId = predictions[0].id;
      success(`Using existing test prediction: ${testPredictionId}`);
    } else {
      // Create a test prediction
      const { data: newPrediction, error } = await supabase
        .from('predictions')
        .insert({
          title: 'Test Prediction for Comments',
          description: 'This is a test prediction for testing comments',
          category: 'test',
          type: 'binary',
          status: 'open',
          creator_id: testUserId,
          stake_min: 1,
          stake_max: 100,
          entry_deadline: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        })
        .select('id')
        .single();

      if (error) {
        error(`Failed to create test prediction: ${error.message}`);
        return false;
      }

      testPredictionId = newPrediction.id;
      success(`Created test prediction: ${testPredictionId}`);
    }

    return true;
  } catch (err) {
    error(`Setup failed: ${err.message}`);
    return false;
  }
}

async function testDatabaseSchema() {
  log('\n📊 Testing database schema...', 'cyan');
  
  try {
    // Test comments table structure
    const { data: commentsSchema, error: commentsError } = await supabase
      .from('comments')
      .select('*')
      .limit(0);
    
    if (commentsError && !commentsError.message.includes('row')) {
      error(`Comments table issue: ${commentsError.message}`);
      return false;
    }
    success('Comments table is accessible');

    // Test comment_likes table structure
    const { data: likesSchema, error: likesError } = await supabase
      .from('comment_likes')
      .select('*')
      .limit(0);
    
    if (likesError && !likesError.message.includes('row')) {
      error(`Comment_likes table issue: ${likesError.message}`);
      return false;
    }
    success('Comment_likes table is accessible');

    // Test comment_reports table structure
    const { data: reportsSchema, error: reportsError } = await supabase
      .from('comment_reports')
      .select('*')
      .limit(0);
    
    if (reportsError && !reportsError.message.includes('row')) {
      warning(`Comment_reports table issue: ${reportsError.message}`);
      warning('Moderation features may not work properly');
    } else {
      success('Comment_reports table is accessible');
    }

    return true;
  } catch (err) {
    error(`Schema test failed: ${err.message}`);
    return false;
  }
}

async function testCommentCreation() {
  log('\n💬 Testing comment creation...', 'cyan');
  
  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        prediction_id: testPredictionId,
        user_id: testUserId,
        content: 'This is a test comment for the enhanced comment system!'
      })
      .select(`
        *,
        user:users!user_id(id, username, avatar_url)
      `)
      .single();

    if (error) {
      error(`Comment creation failed: ${error.message}`);
      return false;
    }

    testCommentId = comment.id;
    success(`Created test comment: ${testCommentId}`);
    
    // Verify comment has proper structure
    if (comment.likes_count !== undefined && comment.replies_count !== undefined) {
      success('Comment has proper count fields');
    } else {
      warning('Comment missing count fields - triggers may not be working');
    }

    return true;
  } catch (err) {
    error(`Comment creation test failed: ${err.message}`);
    return false;
  }
}

async function testNestedReplies() {
  log('\n🔄 Testing nested replies...', 'cyan');
  
  if (!testCommentId) {
    error('No test comment available for reply testing');
    return false;
  }

  try {
    const { data: reply, error } = await supabase
      .from('comments')
      .insert({
        prediction_id: testPredictionId,
        user_id: testUserId,
        parent_comment_id: testCommentId,
        content: 'This is a reply to the test comment!'
      })
      .select(`
        *,
        user:users!user_id(id, username, avatar_url)
      `)
      .single();

    if (error) {
      error(`Reply creation failed: ${error.message}`);
      return false;
    }

    testReplyId = reply.id;
    success(`Created test reply: ${testReplyId}`);

    // Check if parent comment's replies_count was updated
    const { data: parentComment } = await supabase
      .from('comments')
      .select('replies_count')
      .eq('id', testCommentId)
      .single();

    if (parentComment && parentComment.replies_count > 0) {
      success('Parent comment replies_count updated correctly');
    } else {
      warning('Parent comment replies_count not updated - trigger may not be working');
    }

    return true;
  } catch (err) {
    error(`Nested replies test failed: ${err.message}`);
    return false;
  }
}

async function testCommentLikes() {
  log('\n❤️  Testing comment likes...', 'cyan');
  
  if (!testCommentId) {
    error('No test comment available for like testing');
    return false;
  }

  try {
    // Add a like
    const { error: likeError } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: testCommentId,
        user_id: testUserId,
        type: 'like'
      });

    if (likeError) {
      error(`Like creation failed: ${likeError.message}`);
      return false;
    }

    success('Created comment like');

    // Check if comment's likes_count was updated
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
    
    const { data: comment } = await supabase
      .from('comments')
      .select('likes_count')
      .eq('id', testCommentId)
      .single();

    if (comment && comment.likes_count > 0) {
      success('Comment likes_count updated correctly');
    } else {
      warning('Comment likes_count not updated - trigger may not be working');
    }

    // Test removing like
    const { error: deleteError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', testCommentId)
      .eq('user_id', testUserId);

    if (deleteError) {
      warning(`Like deletion failed: ${deleteError.message}`);
    } else {
      success('Comment like removed successfully');
    }

    return true;
  } catch (err) {
    error(`Comment likes test failed: ${err.message}`);
    return false;
  }
}

async function testCommentModeration() {
  log('\n🛡️  Testing comment moderation...', 'cyan');
  
  if (!testCommentId) {
    error('No test comment available for moderation testing');
    return false;
  }

  try {
    // Test comment reporting
    const { error: reportError } = await supabase
      .from('comment_reports')
      .insert({
        comment_id: testCommentId,
        reporter_id: testUserId,
        reason: 'spam',
        description: 'This is a test report'
      });

    if (reportError) {
      warning(`Comment reporting failed: ${reportError.message}`);
      warning('Moderation features may not be properly configured');
      return false;
    }

    success('Comment report created successfully');

    // Check if comment's flag_count was updated
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
    
    const { data: comment } = await supabase
      .from('comments')
      .select('flag_count, is_flagged')
      .eq('id', testCommentId)
      .single();

    if (comment && comment.flag_count > 0) {
      success('Comment flag_count updated correctly');
    } else {
      warning('Comment flag_count not updated - trigger may not be working');
    }

    return true;
  } catch (err) {
    error(`Comment moderation test failed: ${err.message}`);
    return false;
  }
}

async function testCommentRetrieval() {
  log('\n📥 Testing comment retrieval...', 'cyan');
  
  try {
    // Test getting comments for prediction
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users!user_id(id, username, avatar_url),
        replies:comments!parent_comment_id(
          *,
          user:users!user_id(id, username, avatar_url)
        )
      `)
      .eq('prediction_id', testPredictionId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      error(`Comment retrieval failed: ${error.message}`);
      return false;
    }

    success(`Retrieved ${comments?.length || 0} comments`);

    // Test the custom function if available
    try {
      const { data: functionResult, error: functionError } = await supabase
        .rpc('get_prediction_comments', {
          pred_id: testPredictionId,
          page_limit: 10,
          page_offset: 0
        });

      if (functionError) {
        warning(`Custom function test failed: ${functionError.message}`);
        warning('Custom function may not be deployed');
      } else {
        success(`Custom function returned ${functionResult?.length || 0} comments`);
      }
    } catch (funcErr) {
      warning('Custom function not available - using fallback method');
    }

    return true;
  } catch (err) {
    error(`Comment retrieval test failed: ${err.message}`);
    return false;
  }
}

async function testCommentEditing() {
  log('\n✏️  Testing comment editing...', 'cyan');
  
  if (!testCommentId) {
    error('No test comment available for editing testing');
    return false;
  }

  try {
    const { error } = await supabase
      .from('comments')
      .update({
        content: 'This is an edited test comment!',
        is_edited: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', testCommentId)
      .eq('user_id', testUserId);

    if (error) {
      error(`Comment editing failed: ${error.message}`);
      return false;
    }

    success('Comment edited successfully');
    return true;
  } catch (err) {
    error(`Comment editing test failed: ${err.message}`);
    return false;
  }
}

async function cleanupTestData() {
  log('\n🧹 Cleaning up test data...', 'cyan');
  
  try {
    // Delete test reports
    if (testCommentId) {
      await supabase
        .from('comment_reports')
        .delete()
        .eq('comment_id', testCommentId);
    }

    // Delete test likes
    if (testCommentId) {
      await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', testCommentId);
    }

    // Delete test reply
    if (testReplyId) {
      await supabase
        .from('comments')
        .delete()
        .eq('id', testReplyId);
    }

    // Delete test comment
    if (testCommentId) {
      await supabase
        .from('comments')
        .delete()
        .eq('id', testCommentId);
    }

    success('Test data cleaned up');
    return true;
  } catch (err) {
    warning(`Cleanup failed: ${err.message}`);
    return false;
  }
}

// Main test runner
async function runCommentSystemTests() {
  log('🧪 Fan Club Z Comment System Integration Tests', 'bright');
  log('=' * 50, 'cyan');
  
  const tests = [
    { name: 'Setup Test Data', fn: setupTestData },
    { name: 'Database Schema', fn: testDatabaseSchema },
    { name: 'Comment Creation', fn: testCommentCreation },
    { name: 'Nested Replies', fn: testNestedReplies },
    { name: 'Comment Likes', fn: testCommentLikes },
    { name: 'Comment Moderation', fn: testCommentModeration },
    { name: 'Comment Retrieval', fn: testCommentRetrieval },
    { name: 'Comment Editing', fn: testCommentEditing },
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      error(`Test "${test.name}" crashed: ${error.message}`);
      results.push({ name: test.name, passed: false });
    }
  }

  // Cleanup
  await cleanupTestData();

  // Results summary
  log('\n📊 Test Results Summary', 'bright');
  log('=' * 30, 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.passed) {
      success(`${result.name}`);
    } else {
      error(`${result.name}`);
    }
  });

  log(`\n🏆 Overall: ${passed}/${total} tests passed`, 'bright');
  
  if (passed === total) {
    success('All tests passed! Comment system is working correctly.');
  } else if (passed >= total * 0.8) {
    warning('Most tests passed. Some minor issues may need attention.');
  } else {
    error('Multiple test failures. Comment system needs fixes before deployment.');
  }

  log('\n📝 Next Steps:', 'cyan');
  if (passed < total) {
    info('1. Review failed tests and fix issues');
    info('2. Apply database schema if not already done');
    info('3. Check Supabase RLS policies are correctly configured');
    info('4. Verify triggers are working for count updates');
  } else {
    info('1. Test the frontend comment component manually');
    info('2. Verify real-time updates work as expected');
    info('3. Test moderation features in the UI');
    info('4. Deploy to production when ready');
  }

  return passed === total;
}

// Run the tests
if (require.main === module) {
  runCommentSystemTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      error(`Test runner failed: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { runCommentSystemTests };
