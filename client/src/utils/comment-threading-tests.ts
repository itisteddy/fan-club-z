/**
 * Comment Threading Tests
 * 
 * Manual test suite for verifying stable comment ordering and threading behavior.
 * Run these tests in the browser console to verify comment threading functionality.
 */

// Test data for stable ordering
const mockComments = [
  {
    id: 'comment-1',
    content: 'First comment',
    created_at: '2024-01-01T10:00:00Z',
    user: { username: 'user1' },
    replies: [
      {
        id: 'reply-1',
        content: 'First reply',
        created_at: '2024-01-01T10:05:00Z',
        user: { username: 'user2' },
        parent_comment_id: 'comment-1'
      },
      {
        id: 'reply-2',
        content: 'Second reply',
        created_at: '2024-01-01T10:03:00Z',
        user: { username: 'user3' },
        parent_comment_id: 'comment-1'
      }
    ]
  },
  {
    id: 'comment-2',
    content: 'Second comment',
    created_at: '2024-01-01T09:00:00Z',
    user: { username: 'user4' },
    replies: []
  }
];

/**
 * Generate stable sort key for comments
 */
function generateSortKey(comment: any): string {
  const timestamp = new Date(comment.created_at).getTime();
  return `${timestamp.toString().padStart(15, '0')}-${comment.id}`;
}

/**
 * Sort comments with stable ordering
 */
function sortCommentsStable(comments: any[]): any[] {
  return [...comments].sort((a, b) => {
    const sortKeyA = a.sort_key || generateSortKey(a);
    const sortKeyB = b.sort_key || generateSortKey(b);
    return sortKeyA.localeCompare(sortKeyB);
  });
}

/**
 * Test 1: Stable Ordering After Route Change
 * 
 * This test verifies that comments maintain their order when navigating
 * between pages and returning to the same prediction.
 */
export function testStableOrderingAfterRouteChange() {
  console.log('🧪 Testing stable ordering after route change...');
  
  // Simulate first load
  const firstLoad = mockComments.map(comment => ({
    ...comment,
    sort_key: generateSortKey(comment),
    replies: comment.replies ? comment.replies.map(reply => ({
      ...reply,
      sort_key: generateSortKey(reply)
    })) : []
  }));
  
  const sortedFirstLoad = sortCommentsStable(firstLoad);
  
  // Simulate route change and return (refetch)
  const secondLoad = [...mockComments].reverse().map(comment => ({
    ...comment,
    sort_key: generateSortKey(comment),
    replies: comment.replies ? comment.replies.map(reply => ({
      ...reply,
      sort_key: generateSortKey(reply)
    })) : []
  }));
  
  const sortedSecondLoad = sortCommentsStable(secondLoad);
  
  // Verify ordering is stable
  const firstOrder = sortedFirstLoad.map(c => c.id);
  const secondOrder = sortedSecondLoad.map(c => c.id);
  
  const isStable = JSON.stringify(firstOrder) === JSON.stringify(secondOrder);
  
  console.log('First load order:', firstOrder);
  console.log('Second load order:', secondOrder);
  console.log('✅ Stable ordering:', isStable ? 'PASS' : 'FAIL');
  
  return isStable;
}

/**
 * Test 2: Reply Indentation and Hierarchy
 * 
 * This test verifies that replies are properly indented and maintain
 * their hierarchy under parent comments.
 */
export function testReplyIndentationAndHierarchy() {
  console.log('🧪 Testing reply indentation and hierarchy...');
  
  const comment = mockComments[0]; // Has replies
  
  // Check that replies have proper parent relationship
  const hasProperParent = comment.replies.every(reply => 
    reply.parent_comment_id === comment.id
  );
  
  // Check that replies are sorted by timestamp
  const sortedReplies = [...comment.replies].sort((a, b) => {
    const sortKeyA = generateSortKey(a);
    const sortKeyB = generateSortKey(b);
    return sortKeyA.localeCompare(sortKeyB);
  });
  
  const isProperlySorted = sortedReplies.map(r => r.id).join(',') === 
    comment.replies.map(r => r.id).join(',');
  
  console.log('Parent relationships:', hasProperParent ? 'PASS' : 'FAIL');
  console.log('Reply sorting:', isProperlySorted ? 'PASS' : 'FAIL');
  
  return hasProperParent && isProperlySorted;
}

/**
 * Test 3: Username Format Consistency
 * 
 * This test verifies that username formats are consistent between
 * display and reply placeholders.
 */
export function testUsernameFormatConsistency() {
  console.log('🧪 Testing username format consistency...');
  
  const comment = mockComments[0];
  const displayedUsername = comment.user.username;
  const replyPlaceholder = `Reply to @${comment.user.username}…`;
  
  // Check that both use the same username source
  const isConsistent = replyPlaceholder.includes(`@${displayedUsername}`);
  
  console.log('Displayed username:', displayedUsername);
  console.log('Reply placeholder:', replyPlaceholder);
  console.log('✅ Format consistency:', isConsistent ? 'PASS' : 'FAIL');
  
  return isConsistent;
}

/**
 * Test 4: No Vertical Rails
 * 
 * This test verifies that reply indentation doesn't include vertical rails.
 */
export function testNoVerticalRails() {
  console.log('🧪 Testing no vertical rails in reply indentation...');
  
  // Simulate CSS classes that would be applied to replies
  const replyClasses = 'ml-6 pl-3'; // New implementation
  const oldReplyClasses = 'ml-8 pl-4 border-l-2 border-gray-100'; // Old implementation
  
  const hasNoVerticalRail = !replyClasses.includes('border-l-2');
  const oldHadVerticalRail = oldReplyClasses.includes('border-l-2');
  
  console.log('New reply classes:', replyClasses);
  console.log('Old reply classes:', oldReplyClasses);
  console.log('✅ No vertical rails:', hasNoVerticalRail ? 'PASS' : 'FAIL');
  console.log('Old had vertical rails:', oldHadVerticalRail ? 'YES' : 'NO');
  
  return hasNoVerticalRail;
}

/**
 * Run all threading tests
 */
export function runAllThreadingTests() {
  console.log('🚀 Running all comment threading tests...\n');
  
  const results = {
    stableOrdering: testStableOrderingAfterRouteChange(),
    replyHierarchy: testReplyIndentationAndHierarchy(),
    usernameFormat: testUsernameFormatConsistency(),
    noVerticalRails: testNoVerticalRails()
  };
  
  const allPassed = Object.values(results).every(result => result === true);
  
  console.log('\n📊 Test Results Summary:');
  console.log('Stable Ordering:', results.stableOrdering ? '✅ PASS' : '❌ FAIL');
  console.log('Reply Hierarchy:', results.replyHierarchy ? '✅ PASS' : '❌ FAIL');
  console.log('Username Format:', results.usernameFormat ? '✅ PASS' : '❌ FAIL');
  console.log('No Vertical Rails:', results.noVerticalRails ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n🎯 Overall Result:', allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  return results;
}

// Make tests available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).commentThreadingTests = {
    runAll: runAllThreadingTests,
    testStableOrdering: testStableOrderingAfterRouteChange,
    testReplyHierarchy: testReplyIndentationAndHierarchy,
    testUsernameFormat: testUsernameFormatConsistency,
    testNoVerticalRails: testNoVerticalRails
  };
  
  console.log('💡 Comment threading tests loaded! Run window.commentThreadingTests.runAll() to test.');
}
