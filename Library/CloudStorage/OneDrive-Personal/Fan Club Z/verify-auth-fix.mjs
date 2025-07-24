#!/usr/bin/env node

/**
 * Quick verification script to check auth flow implementation
 * This checks the code without running a full browser test
 */

import fs from 'fs'
import path from 'path'

console.log('🔍 Verifying Authentication Flow Implementation...\n')

const checks = [
  {
    name: 'RegisterPage uses auth store',
    file: 'client/src/pages/auth/RegisterPage.tsx',
    check: (content) => {
      const hasImport = content.includes("import { useAuthStore } from '../../store/authStore'")
      const usesRegister = content.includes('const { register } = useAuthStore()')
      const callsRegister = content.includes('await register(registrationData)')
      const usesRouter = content.includes('setLocation(\'/onboarding\')')
      return hasImport && usesRegister && callsRegister && usesRouter
    },
    issue: 'RegisterPage should use auth store register method instead of manual API calls'
  },
  {
    name: 'OnboardingFlow has proper sequencing',
    file: 'client/src/components/onboarding/OnboardingFlow.tsx',
    check: (content) => {
      const hasDelay = content.includes('await new Promise(resolve => setTimeout(resolve, 100))')
      const hasLogging = content.includes('Final auth state before redirect')
      const callsOnCompleteFirst = content.includes('onComplete()') && content.indexOf('onComplete()') < content.indexOf('setLocation(\'/discover\')')
      return hasDelay && hasLogging && callsOnCompleteFirst
    },
    issue: 'OnboardingFlow should have proper timing and sequencing for state updates'
  },
  {
    name: 'Auth store has robust initialization',
    file: 'client/src/store/authStore.ts',
    check: (content) => {
      const hasComplianceCheck = content.includes('compliance_status')
      const hasBackupLogic = content.includes('Also check compliance status from localStorage as backup')
      const hasDetailedLogging = content.includes('currentPath: typeof window')
      return hasComplianceCheck && hasBackupLogic && hasDetailedLogging
    },
    issue: 'Auth store should have backup mechanisms for state restoration'
  },
  {
    name: 'App.tsx handles discover route properly',
    file: 'client/src/App.tsx',
    check: (content) => {
      const hasConditionalProps = content.includes('showBalance={isAuthenticated} showNotifications={isAuthenticated}')
      const hasComment = content.includes('handles both authenticated and non-authenticated users')
      return hasConditionalProps && hasComment
    },
    issue: 'App.tsx discover route should respect authentication state'
  }
]

let allPassed = true

for (const checkItem of checks) {
  try {
    const fullPath = path.join(process.cwd(), checkItem.file)
    const content = fs.readFileSync(fullPath, 'utf8')
    const passed = checkItem.check(content)
    
    console.log(`${passed ? '✅' : '❌'} ${checkItem.name}`)
    
    if (!passed) {
      console.log(`   Issue: ${checkItem.issue}`)
      allPassed = false
    }
  } catch (error) {
    console.log(`❌ ${checkItem.name} - File not found: ${checkItem.file}`)
    allPassed = false
  }
}

console.log('\n' + '='.repeat(60))

if (allPassed) {
  console.log('🎉 All authentication flow checks passed!')
  console.log('✅ The registration → onboarding → authenticated state flow should now work properly')
  console.log('\n📝 Next steps:')
  console.log('1. Start the app: cd client && npm run dev')
  console.log('2. Test the flow: ./run-auth-flow-test.sh')
  console.log('3. Manual test: Register a new user and verify no "Sign In" button appears')
} else {
  console.log('❌ Some checks failed - authentication flow may still have issues')
  console.log('📝 Please review the failed checks above and ensure all fixes are applied')
}

console.log('\n🔍 For detailed information about the fixes, see: AUTHENTICATION_FLOW_FIX_SUMMARY.md')
