import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import type { 
  User, 
  Bet, 
  BetEntry, 
  Club, 
  ClubMember, 
  ClubDiscussion, 
  Comment, 
  Transaction, 
  Dispute 
} from '@shared/schema'

// In-memory storage for development
class InMemoryStorage {
  users: Map<string, User> = new Map()
  bets: Map<string, Bet> = new Map()
  betEntries: Map<string, BetEntry> = new Map()
  clubs: Map<string, Club> = new Map()
  clubMembers: Map<string, ClubMember> = new Map()
  clubDiscussions: Map<string, ClubDiscussion> = new Map()
  comments: Map<string, Comment> = new Map()
  transactions: Map<string, Transaction> = new Map()
  disputes: Map<string, Dispute> = new Map()

  constructor() {
    this.initializeMockData()
  }

  private async initializeMockData() {
    // Create demo user
    const demoPassword = await bcrypt.hash('demo123', 10)
    const demoUser: User = {
      id: 'demo-user',
      email: 'demo@fanclubz.app',
      phone: '+1234567890',
      username: 'demouser',
      firstName: 'Demo',
      lastName: 'User',
      dateOfBirth: '1990-01-01',
      walletAddress: '0x' + '0'.repeat(40),
      kycLevel: 'basic',
      walletBalance: 1000,
      profileImage: undefined,
      coverImage: undefined,
      bio: 'Demo user for testing Fan Club Z',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.users.set(demoUser.id, demoUser)

    // Create additional test users
    const testUsers = [
      {
        id: 'user-1',
        email: 'alex@example.com',
        username: 'alexj',
        firstName: 'Alex',
        lastName: 'Johnson'
      },
      {
        id: 'user-2',
        email: 'sarah@example.com',
        username: 'sarahc',
        firstName: 'Sarah',
        lastName: 'Chen'
      },
      {
        id: 'user-3',
        email: 'mike@example.com',
        username: 'miket',
        firstName: 'Mike',
        lastName: 'Thompson'
      }
    ]

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash('password123', 10)
      const user: User = {
        ...userData,
        dateOfBirth: '1990-01-01',
        phone: '+1234567890',
        walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
        kycLevel: 'basic',
        walletBalance: Math.floor(Math.random() * 500) + 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      this.users.set(user.id, user)
    }

    // Create mock bets
    const mockBets: Omit<Bet, 'id'>[] = [
      {
        creatorId: 'user-1',
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
        creatorId: 'user-2',
        title: 'Premier League: Man City vs Arsenal - Who wins?',
        description: 'The title race is heating up! City and Arsenal face off.',
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
        creatorId: 'user-3',
        title: 'Taylor Swift announces surprise album?',
        description: 'Swifties are convinced she\'s dropping hints. Will T-Swift surprise us this month?',
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

    mockBets.forEach(betData => {
      const bet: Bet = {
        id: uuidv4(),
        ...betData
      }
      this.bets.set(bet.id, bet)
    })

    // Create mock clubs
    const mockClubs: Omit<Club, 'id'>[] = [
      {
        name: 'Premier League Predictors',
        description: 'The ultimate destination for Premier League betting and predictions',
        category: 'sports',
        creatorId: 'user-1',
        memberCount: 1247,
        isPrivate: false,
        imageUrl: '⚽',
        rules: 'Be respectful, no spam, only Premier League related bets.',
        createdAt: '2025-06-15T10:00:00Z',
        updatedAt: '2025-07-04T15:45:00Z'
      },
      {
        name: 'Crypto Bulls',
        description: 'Betting on cryptocurrency prices and market movements',
        category: 'crypto',
        creatorId: 'user-2',
        memberCount: 892,
        isPrivate: false,
        imageUrl: '₿',
        createdAt: '2025-06-20T14:30:00Z',
        updatedAt: '2025-07-04T12:00:00Z'
      },
      {
        name: 'Pop Culture Central',
        description: 'Celebrity drama, award shows, and entertainment bets',
        category: 'pop',
        creatorId: 'user-3',
        memberCount: 2156,
        isPrivate: false,
        imageUrl: '🎭',
        createdAt: '2025-06-10T09:00:00Z',
        updatedAt: '2025-07-04T10:15:00Z'
      }
    ]

    mockClubs.forEach(clubData => {
      const club: Club = {
        id: uuidv4(),
        ...clubData
      }
      this.clubs.set(club.id, club)
    })

    // Create mock transactions for demo user
    const mockTransactions: Omit<Transaction, 'id'>[] = [
      {
        userId: 'demo-user',
        type: 'deposit',
        currency: 'USD',
        amount: 500,
        status: 'completed',
        reference: 'DEP-' + Date.now(),
        description: 'Card deposit',
        createdAt: '2025-07-04T10:30:00Z',
        updatedAt: '2025-07-04T10:30:00Z'
      },
      {
        userId: 'demo-user',
        type: 'bet_lock',
        currency: 'USD',
        amount: 50,
        status: 'completed',
        reference: 'BET-' + Date.now(),
        description: 'Bet: Bitcoin to $100K',
        createdAt: '2025-07-04T09:15:00Z',
        updatedAt: '2025-07-04T09:15:00Z'
      },
      {
        userId: 'demo-user',
        type: 'bet_release',
        currency: 'USD',
        amount: 120,
        status: 'completed',
        reference: 'WIN-' + Date.now(),
        description: 'Won: Premier League bet',
        createdAt: '2025-07-03T16:45:00Z',
        updatedAt: '2025-07-03T16:45:00Z'
      }
    ]

    mockTransactions.forEach(transactionData => {
      const transaction: Transaction = {
        id: uuidv4(),
        ...transactionData
      }
      this.transactions.set(transaction.id, transaction)
    })
  }

  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.users.set(user.id, user)
    return user
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async getUserByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user
      }
    }
    return null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = this.users.get(id)
    if (!user) return null

    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.users.set(id, updatedUser)
    return updatedUser
  }

  // Bet operations
  async createBet(betData: Omit<Bet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bet> {
    const bet: Bet = {
      id: uuidv4(),
      ...betData,
      poolTotal: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.bets.set(bet.id, bet)
    return bet
  }

  async getBetById(id: string): Promise<Bet | null> {
    return this.bets.get(id) || null
  }

  async getBets(filters?: any): Promise<Bet[]> {
    const bets = Array.from(this.bets.values())
    
    if (filters?.category && filters.category !== 'all') {
      return bets.filter(bet => bet.category === filters.category)
    }
    
    if (filters?.status) {
      return bets.filter(bet => bet.status === filters.status)
    }
    
    return bets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  async getBetsByCreator(creatorId: string): Promise<Bet[]> {
    return Array.from(this.bets.values()).filter(bet => bet.creatorId === creatorId)
  }

  async updateBet(id: string, updates: Partial<Bet>): Promise<Bet | null> {
    const bet = this.bets.get(id)
    if (!bet) return null

    const updatedBet = {
      ...bet,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    this.bets.set(id, updatedBet)
    return updatedBet
  }

  // Transaction operations
  async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const transaction: Transaction = {
      id: uuidv4(),
      ...transactionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.transactions.set(transaction.id, transaction)
    return transaction
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Club operations
  async createClub(clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<Club> {
    const club: Club = {
      id: uuidv4(),
      ...clubData,
      memberCount: 1, // Creator is the first member
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    this.clubs.set(club.id, club)
    return club
  }

  async getClubById(id: string): Promise<Club | null> {
    return this.clubs.get(id) || null
  }

  async getClubs(): Promise<Club[]> {
    return Array.from(this.clubs.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Helper methods
  async updateUserBalance(userId: string, amount: number): Promise<boolean> {
    const user = this.users.get(userId)
    if (!user) return false

    user.walletBalance += amount
    user.updatedAt = new Date().toISOString()
    this.users.set(userId, user)
    return true
  }
}

export const storage = new InMemoryStorage()
export default storage
