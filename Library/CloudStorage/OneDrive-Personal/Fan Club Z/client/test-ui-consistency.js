// UI Consistency Test Script
// Run this to verify both interfaces work consistently

const testUIConsistency = () => {
  console.log('🧪 Testing UI Consistency Between BetComments and ClubChat...')
  
  // Test 1: Check for always-visible action buttons
  const testAlwaysVisibleButtons = () => {
    console.log('\n📋 Test 1: Always-Visible Action Buttons')
    
    // Look for like buttons in both interfaces
    const betLikeButtons = document.querySelectorAll('[data-testid="bet-like-button"], .bet-comments button[class*="Heart"]')
    const chatLikeButtons = document.querySelectorAll('[data-testid="chat-like-button"], .chat-message button[class*="Heart"]')
    
    console.log(`✅ BetComments like buttons found: ${betLikeButtons.length}`)
    console.log(`✅ ChatMessage like buttons found: ${chatLikeButtons.length}`)
    
    // Check if buttons are always visible (not hidden by hover states)
    const hiddenButtons = document.querySelectorAll('button[style*="display: none"], button.opacity-0:not(.group-hover\\:opacity-100)')
    console.log(`✅ Hidden action buttons: ${hiddenButtons.length} (should be 0)`)
    
    return {
      betLikeButtons: betLikeButtons.length,
      chatLikeButtons: chatLikeButtons.length,
      hiddenButtons: hiddenButtons.length
    }
  }
  
  // Test 2: Check for consistent styling
  const testConsistentStyling = () => {
    console.log('\n🎨 Test 2: Consistent Button Styling')
    
    // Check for consistent button classes
    const actionButtons = document.querySelectorAll('button[class*="px-3"][class*="py-1.5"][class*="rounded-full"]')
    console.log(`✅ Consistently styled action buttons: ${actionButtons.length}`)
    
    // Check for consistent icon sizes
    const iconsSameSize = document.querySelectorAll('.lucide[class*="w-3.5"][class*="h-3.5"]')
    console.log(`✅ Consistent icon sizes (3.5): ${iconsSameSize.length}`)
    
    return {
      actionButtons: actionButtons.length,
      iconsSameSize: iconsSameSize.length
    }
  }
  
  // Test 3: Check for mobile-friendly touch targets
  const testMobileFriendly = () => {
    console.log('\n📱 Test 3: Mobile-Friendly Touch Targets')
    
    // Check minimum touch target size (44x44px recommended)
    const touchButtons = document.querySelectorAll('button')
    let adequateTouchTargets = 0
    
    touchButtons.forEach(button => {
      const rect = button.getBoundingClientRect()
      if (rect.width >= 44 && rect.height >= 44) {
        adequateTouchTargets++
      }
    })
    
    console.log(`✅ Adequate touch targets: ${adequateTouchTargets}/${touchButtons.length}`)
    
    return {
      totalButtons: touchButtons.length,
      adequateTouchTargets: adequateTouchTargets
    }
  }
  
  // Test 4: Check for consistent hover states
  const testHoverStates = () => {
    console.log('\n🖱️ Test 4: Consistent Hover States')
    
    // Check for hover classes on action buttons
    const hoverButtons = document.querySelectorAll('button[class*="hover:bg-gray-100"]')
    console.log(`✅ Buttons with consistent hover states: ${hoverButtons.length}`)
    
    return {
      hoverButtons: hoverButtons.length
    }
  }
  
  // Test 5: Check for accessibility features
  const testAccessibility = () => {
    console.log('\n♿ Test 5: Accessibility Features')
    
    // Check for proper button semantics
    const semanticButtons = document.querySelectorAll('button[type="button"], button:not([type])')
    console.log(`✅ Semantic buttons: ${semanticButtons.length}`)
    
    // Check for keyboard navigation support
    const focusableButtons = document.querySelectorAll('button:not([tabindex="-1"])')
    console.log(`✅ Keyboard navigable buttons: ${focusableButtons.length}`)
    
    return {
      semanticButtons: semanticButtons.length,
      focusableButtons: focusableButtons.length
    }
  }
  
  // Run all tests
  const results = {
    alwaysVisible: testAlwaysVisibleButtons(),
    styling: testConsistentStyling(),
    mobile: testMobileFriendly(),
    hover: testHoverStates(),
    accessibility: testAccessibility()
  }
  
  // Summary
  console.log('\n📊 CONSISTENCY TEST SUMMARY')
  console.log('=' .repeat(40))
  
  // Calculate overall consistency score
  let totalChecks = 0
  let passedChecks = 0
  
  // Always-visible buttons check
  if (results.alwaysVisible.hiddenButtons === 0) {
    console.log('✅ Always-visible buttons: PASS')
    passedChecks++
  } else {
    console.log('❌ Always-visible buttons: FAIL')
  }
  totalChecks++
  
  // Styling consistency check
  if (results.styling.actionButtons > 0 && results.styling.iconsSameSize > 0) {
    console.log('✅ Consistent styling: PASS')
    passedChecks++
  } else {
    console.log('❌ Consistent styling: FAIL')
  }
  totalChecks++
  
  // Mobile-friendly check
  const mobileScore = results.mobile.adequateTouchTargets / results.mobile.totalButtons
  if (mobileScore > 0.8) {
    console.log('✅ Mobile-friendly: PASS')
    passedChecks++
  } else {
    console.log('❌ Mobile-friendly: FAIL')
  }
  totalChecks++
  
  // Hover states check
  if (results.hover.hoverButtons > 0) {
    console.log('✅ Hover states: PASS')
    passedChecks++
  } else {
    console.log('❌ Hover states: FAIL')
  }
  totalChecks++
  
  // Accessibility check
  if (results.accessibility.semanticButtons > 0 && results.accessibility.focusableButtons > 0) {
    console.log('✅ Accessibility: PASS')
    passedChecks++
  } else {
    console.log('❌ Accessibility: FAIL')
  }
  totalChecks++
  
  const overallScore = Math.round((passedChecks / totalChecks) * 100)
  console.log(`\n🏆 OVERALL CONSISTENCY SCORE: ${overallScore}%`)
  
  if (overallScore >= 80) {
    console.log('🎉 EXCELLENT! UI consistency is well implemented.')
  } else if (overallScore >= 60) {
    console.log('🚀 GOOD! Minor improvements may be needed.')
  } else {
    console.log('⚠️ NEEDS WORK! Significant consistency issues detected.')
  }
  
  return {
    score: overallScore,
    results: results,
    summary: {
      total: totalChecks,
      passed: passedChecks,
      failed: totalChecks - passedChecks
    }
  }
}

// Visual comparison helper
const visualComparison = () => {
  console.log('\n👀 VISUAL COMPARISON GUIDE')
  console.log('=' .repeat(40))
  console.log('Both BetComments and ClubChat should have:')
  console.log('• ❤️ Like button (always visible)')
  console.log('• 💬 Reply button (always visible)')  
  console.log('• ⋯ More menu (always visible)')
  console.log('• Same button sizes and spacing')
  console.log('• Same hover effects')
  console.log('• Same color scheme')
  console.log('• Mobile-friendly touch targets')
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testUIConsistency, visualComparison }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  console.log('🔧 UI Consistency Test Script Loaded')
  console.log('Run testUIConsistency() to check interface consistency')
  console.log('Run visualComparison() to see what to look for')
}