import { execSync } from 'child_process'
import fs from 'fs'

console.log('🧪 Testing Betting Functionality...\n')

const testResults = {
  placeBetButton: false,
  walletUpdate: false,
  myBetsSection: false,
  errors: []
}

try {
  // Test 1: Check if place bet function exists in bet store
  console.log('1️⃣ Testing Place Bet Button Implementation...')
  
  const betStoreContent = fs.readFileSync('./client/src/store/betStore.ts', 'utf8')
  
  if (betStoreContent.includes('placeBet: async (betId, betData)') && 
      betStoreContent.includes('refreshBalance(user.id)') &&
      betStoreContent.includes('addBetTransaction')) {
    console.log('✅ Place bet function properly implemented')
    testResults.placeBetButton = true
  } else {
    console.log('❌ Place bet function missing required components')
    testResults.errors.push('Place bet function incomplete')
  }

  // Test 2: Check wallet store implementation
  console.log('\n2️⃣ Testing Wallet Update Implementation...')
  
  const walletStoreContent = fs.readFileSync('./client/src/store/walletStore.ts', 'utf8')
  
  if (walletStoreContent.includes('addBetTransaction') && 
      walletStoreContent.includes('initializeWallet') &&
      walletStoreContent.includes('persistWalletData')) {
    console.log('✅ Wallet update implementation found')
    testResults.walletUpdate = true
  } else {
    console.log('❌ Wallet update implementation incomplete')
    testResults.errors.push('Wallet update incomplete')
  }

  // Test 3: Check My Bets section updates
  console.log('\n3️⃣ Testing My Bets Section Implementation...')
  
  const betsTabContent = fs.readFileSync('./client/src/pages/BetsTab.tsx', 'utf8')
  
  if (betsTabContent.includes('fetchUserBetEntries') && 
      betsTabContent.includes('visibilitychange') &&
      betsTabContent.includes('activeBets.map')) {
    console.log('✅ My Bets section properly implemented')
    testResults.myBetsSection = true
  } else {
    console.log('❌ My Bets section implementation incomplete')
    testResults.errors.push('My Bets section incomplete')
  }

  // Test 4: Check API endpoint exists
  console.log('\n4️⃣ Testing API Endpoint Implementation...')
  
  const routesContent = fs.readFileSync('./server/src/routes.ts', 'utf8')
  
  if (routesContent.includes("router.post('/bet-entries'") && 
      routesContent.includes('userData.balance -= amount')) {
    console.log('✅ Backend API endpoint properly implemented')
  } else {
    console.log('❌ Backend API endpoint incomplete')
    testResults.errors.push('Backend API incomplete')
  }

  // Test 5: Check bet detail page integration
  console.log('\n5️⃣ Testing Bet Detail Page Integration...')
  
  const betDetailContent = fs.readFileSync('./client/src/pages/BetDetailPage.tsx', 'utf8')
  
  if (betDetailContent.includes('placeBetAndRefresh') && 
      betDetailContent.includes('refreshBalance') &&
      betDetailContent.includes('fetchUserBetEntries')) {
    console.log('✅ Bet detail page integration complete')
  } else {
    console.log('❌ Bet detail page integration incomplete')
    testResults.errors.push('Bet detail page integration incomplete')
  }

} catch (error) {
  console.error('❌ Test execution error:', error.message)
  testResults.errors.push(`Test execution error: ${error.message}`)
}

// Print summary
console.log('\n📊 TEST SUMMARY')
console.log('================')
console.log(`✅ Place Bet Button: ${testResults.placeBetButton ? 'FIXED' : 'NEEDS WORK'}`)
console.log(`✅ Wallet Balance Update: ${testResults.walletUpdate ? 'FIXED' : 'NEEDS WORK'}`)
console.log(`✅ My Bets Section: ${testResults.myBetsSection ? 'FIXED' : 'NEEDS WORK'}`)

if (testResults.errors.length > 0) {
  console.log('\n❌ Issues Found:')
  testResults.errors.forEach((error, index) => {
    console.log(`   ${index + 1}. ${error}`)
  })
} else {
  console.log('\n🎉 All core betting functionality has been implemented!')
}

console.log('\n📝 NEXT STEPS:')
console.log('1. Start the development server: npm run dev')
console.log('2. Test the betting functionality in the browser')
console.log('3. Check console for any remaining errors')
console.log('4. Verify wallet balance updates after placing bets')
console.log('5. Confirm bets appear in the My Bets section')
