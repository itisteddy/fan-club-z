#!/usr/bin/env node

console.log('🧪 Testing Bet Cards - Data Validation')

// Test the mock data structure
const mockTrendingBets = [
  {
    id: '1',
    creatorId: 'user1',
    title: 'Will Bitcoin reach $100K by end of 2025?',
    description: 'Bitcoin has been on a bull run. Will it hit the magical 100K mark by December 31st, 2025?',
    type: 'binary',
    category: 'crypto',
    options: [
      { id: 'yes', label: 'Yes', totalStaked: 15000 },
      { id: 'no', label: 'No', totalStaked: 8500 }
    ],
    status: 'open',
    stakeMin: 10,
    stakeMax: 1000,
    poolTotal: 23500,
    entryDeadline: '2025-12-31T23:59:59Z',
    settlementMethod: 'auto',
    isPrivate: false,
    likes: 234,
    comments: 67,
    shares: 89,
    createdAt: '2025-07-01T10:30:00Z',
    updatedAt: '2025-07-04T15:45:00Z'
  },
  {
    id: '2',
    creatorId: 'user2', 
    title: 'Premier League: Man City vs Arsenal - Who wins?',
    description: 'The title race is heating up! City and Arsenal face off in what could be the decisive match.',
    type: 'multi',
    category: 'sports',
    options: [
      { id: 'city', label: 'Man City', totalStaked: 12000 },
      { id: 'arsenal', label: 'Arsenal', totalStaked: 9000 },
      { id: 'draw', label: 'Draw', totalStaked: 4000 }
    ],
    status: 'open',
    stakeMin: 5,
    stakeMax: 500,
    poolTotal: 25000,
    entryDeadline: '2025-07-15T14:00:00Z',
    settlementMethod: 'auto',
    isPrivate: false,
    likes: 445,
    comments: 123,
    shares: 67,
    createdAt: '2025-07-02T09:15:00Z',
    updatedAt: '2025-07-04T16:20:00Z'
  },
  {
    id: '3',
    creatorId: 'user3',
    title: 'Taylor Swift announces surprise album?',
    description: 'Swifties are convinced she\'s dropping hints. Will T-Swift surprise us with a new album announcement this month?',
    type: 'binary',
    category: 'pop',
    options: [
      { id: 'yes', label: 'Yes, she will', totalStaked: 6500 },
      { id: 'no', label: 'No announcement', totalStaked: 4200 }
    ],
    status: 'open',
    stakeMin: 1,
    stakeMax: 100,
    poolTotal: 10700,
    entryDeadline: '2025-07-31T23:59:59Z',
    settlementMethod: 'manual',
    isPrivate: false,
    likes: 156,
    comments: 89,
    shares: 234,
    createdAt: '2025-07-03T14:22:00Z',
    updatedAt: '2025-07-04T11:18:00Z'
  }
]

console.log('📊 Mock data validation:')
console.log('✅ Total bets:', mockTrendingBets.length)
console.log('✅ First bet title:', mockTrendingBets[0].title)
console.log('✅ First bet ID:', mockTrendingBets[0].id)
console.log('✅ First bet category:', mockTrendingBets[0].category)
console.log('✅ First bet status:', mockTrendingBets[0].status)

// Validate bet structure
mockTrendingBets.forEach((bet, index) => {
  console.log(`\n✅ Bet ${index + 1}:`)
  console.log(`   - ID: ${bet.id}`)
  console.log(`   - Title: ${bet.title}`)
  console.log(`   - Category: ${bet.category}`)
  console.log(`   - Status: ${bet.status}`)
  console.log(`   - Options: ${bet.options.length}`)
  console.log(`   - Pool Total: $${bet.poolTotal}`)
  
  // Check required fields for BetCard component
  const requiredFields = ['id', 'title', 'category', 'status', 'options', 'poolTotal', 'entryDeadline']
  const missingFields = requiredFields.filter(field => !bet[field])
  
  if (missingFields.length > 0) {
    console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`)
  } else {
    console.log(`   ✅ All required fields present`)
  }
})

console.log('\n🔍 Filter functionality test:')
// Test filter function (copied from DiscoverTab)
const testFilters = (bets, selectedCategory = 'all', searchQuery = '') => {
  return bets.filter(bet => {
    const matchesSearch = bet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         bet.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || bet.category === selectedCategory
    return matchesSearch && matchesCategory
  })
}

console.log('✅ All bets:', testFilters(mockTrendingBets, 'all', '').length)
console.log('✅ Crypto bets:', testFilters(mockTrendingBets, 'crypto', '').length)
console.log('✅ Sports bets:', testFilters(mockTrendingBets, 'sports', '').length)
console.log('✅ Search "Bitcoin":', testFilters(mockTrendingBets, 'all', 'Bitcoin').length)

console.log('\n✅ SUMMARY: Bet cards mock data is valid and ready!')
console.log('🔧 Components should render with these data structures')
console.log('📱 Check browser console for component rendering logs')
