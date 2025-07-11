import { v4 as uuidv4 } from 'uuid'
import { db } from '../database/config.js'
import type { 
  User, 
  Bet, 
  BetEntry, 
  Club, 
  Transaction,
  Comment 
} from '@shared/schema'

export class DatabaseStorage {
  // User operations
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { dateOfBirth: string }): Promise<User> {
    const [user] = await db('users')
      .insert({
        id: uuidv4(),
        email: userData.email,
        username: userData.username,
        password_hash: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone,
        date_of_birth: userData.dateOfBirth,
        wallet_address: userData.walletAddress,
        kyc_level: userData.kycLevel,
        wallet_balance: userData.walletBalance,
        profile_image_url: userData.profileImage,
        cover_image_url: userData.coverImage,
        bio: userData.bio,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapUserFromDB(user)
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await db('users').where('id', id).first()
    return user ? this.mapUserFromDB(user) : null
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await db('users').where('email', email).first()
    return user ? this.mapUserFromDB(user) : null
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await db('users').where('username', username).first()
    return user ? this.mapUserFromDB(user) : null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // Handle demo user case
    if (id === 'demo-user-id') {
      const demoUser = {
        id: 'demo-user-id',
        firstName: 'Demo',
        lastName: 'User',
        username: 'demo_user',
        email: 'demo@fanclubz.app',
        phone: '+1 (555) 123-4567',
        dateOfBirth: '1990-01-01',
        bio: 'Demo account for testing Fan Club Z features',
        profileImage: undefined,
        walletAddress: '0xDemoWalletAddress123456789',
        kycLevel: 'enhanced' as const,
        walletBalance: updates.walletBalance !== undefined ? updates.walletBalance : 2500,
        stripeCustomerId: updates.stripeCustomerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return demoUser
    }

    const dbUpdates: any = {}
    
    if (updates.firstName) dbUpdates.first_name = updates.firstName
    if (updates.lastName) dbUpdates.last_name = updates.lastName
    if (updates.phone) dbUpdates.phone = updates.phone
    if (updates.dateOfBirth) dbUpdates.date_of_birth = updates.dateOfBirth
    if (updates.kycLevel) dbUpdates.kyc_level = updates.kycLevel
    if (updates.walletBalance !== undefined) dbUpdates.wallet_balance = updates.walletBalance
    if (updates.profileImage) dbUpdates.profile_image_url = updates.profileImage
    if (updates.coverImage) dbUpdates.cover_image_url = updates.coverImage
    if (updates.bio) dbUpdates.bio = updates.bio
    if (updates.stripeCustomerId) dbUpdates.stripe_customer_id = updates.stripeCustomerId
    
    dbUpdates.updated_at = new Date()

    const [user] = await db('users')
      .where('id', id)
      .update(dbUpdates)
      .returning('*')

    return user ? this.mapUserFromDB(user) : null
  }

  async updateUserBalance(userId: string, amount: number): Promise<boolean> {
    const result = await db('users')
      .where('id', userId)
      .increment('wallet_balance', amount)
    
    return result > 0
  }

  // Bet operations
  async createBet(betData: Omit<Bet, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bet> {
    const [bet] = await db('bets')
      .insert({
        id: uuidv4(),
        creator_id: betData.creatorId,
        title: betData.title,
        description: betData.description,
        type: betData.type,
        category: betData.category,
        options: JSON.stringify(betData.options),
        status: betData.status,
        stake_min: betData.stakeMin,
        stake_max: betData.stakeMax,
        pool_total: betData.poolTotal,
        entry_deadline: betData.entryDeadline,
        settlement_method: betData.settlementMethod,
        is_private: betData.isPrivate,
        club_id: betData.clubId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapBetFromDB(bet)
  }

  async getBetById(id: string): Promise<Bet | null> {
    const bet = await db('bets').where('id', id).first()
    return bet ? this.mapBetFromDB(bet) : null
  }

  async getBets(filters?: any): Promise<Bet[]> {
    let query = db('bets')
      .orderBy('created_at', 'desc')

    if (filters?.category) {
      query = query.where('category', filters.category)
    }
    if (filters?.status) {
      query = query.where('status', filters.status)
    }
    if (filters?.creatorId) {
      query = query.where('creator_id', filters.creatorId)
    }

    const bets = await query
    console.log('[getBets] Raw DB rows:', bets)
    const mapped = bets.map(bet => this.mapBetFromDB(bet))
    console.log('[getBets] Mapped bets:', mapped)
    return mapped
  }

  async getBetsByCreator(creatorId: string): Promise<Bet[]> {
    const bets = await db('bets')
      .where('creator_id', creatorId)
      .orderBy('created_at', 'desc')
    
    return bets.map(bet => this.mapBetFromDB(bet))
  }

  async updateBet(id: string, updates: Partial<Bet>): Promise<Bet | null> {
    const dbUpdates: any = {}
    
    if (updates.title) dbUpdates.title = updates.title
    if (updates.description) dbUpdates.description = updates.description
    if (updates.status) dbUpdates.status = updates.status
    if (updates.poolTotal !== undefined) dbUpdates.pool_total = updates.poolTotal
    if (updates.options) dbUpdates.options = JSON.stringify(updates.options)
    
    dbUpdates.updated_at = new Date()

    const [bet] = await db('bets')
      .where('id', id)
      .update(dbUpdates)
      .returning('*')

    return bet ? this.mapBetFromDB(bet) : null
  }

  // Bet Entry operations
  async createBetEntry(entryData: Omit<BetEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<BetEntry> {
    const [entry] = await db('bet_entries')
      .insert({
        id: uuidv4(),
        bet_id: entryData.betId,
        user_id: entryData.userId,
        option_id: entryData.optionId,
        amount: entryData.amount,
        odds: entryData.odds,
        potential_winnings: entryData.potentialWinnings,
        status: entryData.status,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapBetEntryFromDB(entry)
  }

  async getBetEntriesByUser(userId: string): Promise<BetEntry[]> {
    const entries = await db('bet_entries')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
    
    return entries.map(entry => this.mapBetEntryFromDB(entry))
  }

  // Comment operations
  async createComment(commentData: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Comment> {
    const [comment] = await db('comments')
      .insert({
        id: uuidv4(),
        content: commentData.content,
        author_id: commentData.authorId,
        target_type: commentData.targetType,
        target_id: commentData.targetId,
        likes: 0,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapCommentFromDB(comment)
  }

  async getCommentsByBet(betId: string): Promise<Comment[]> {
    const comments = await db('comments')
      .where('target_type', 'bet')
      .where('target_id', betId)
      .orderBy('created_at', 'desc')
    
    return comments.map(comment => this.mapCommentFromDB(comment))
  }

  // Transaction operations
  async createTransaction(txData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    // Handle demo user case
    if (txData.userId === 'demo-user-id') {
      const mockTransaction: Transaction = {
        id: uuidv4(),
        userId: txData.userId,
        type: txData.type,
        currency: txData.currency,
        amount: txData.amount,
        status: txData.status,
        reference: txData.reference,
        description: txData.description,
        fromUserId: txData.fromUserId,
        toUserId: txData.toUserId,
        betId: txData.betId,
        paymentIntentId: txData.paymentIntentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return mockTransaction
    }

    const [tx] = await db('transactions')
      .insert({
        id: uuidv4(),
        user_id: txData.userId,
        type: txData.type,
        currency: txData.currency,
        amount: txData.amount,
        status: txData.status,
        reference: txData.reference,
        description: txData.description,
        from_user_id: txData.fromUserId,
        to_user_id: txData.toUserId,
        bet_id: txData.betId,
        payment_intent_id: txData.paymentIntentId,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapTransactionFromDB(tx)
  }

  async getTransactionsByUser(userId: string): Promise<Transaction[]> {
    const transactions = await db('transactions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
    return transactions.map(this.mapTransactionFromDB)
  }

  async getUserTransactions(userId: string, page: number = 1, limit: number = 20): Promise<Transaction[]> {
    // Handle demo user case
    if (userId === 'demo-user-id') {
      const mockTransactions: Transaction[] = [
        {
          id: 'txn_1',
          userId: 'demo-user-id',
          type: 'deposit',
          currency: 'USD',
          amount: 100,
          status: 'completed',
          reference: 'demo_deposit_001',
          description: 'Demo wallet deposit',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'txn_2',
          userId: 'demo-user-id',
          type: 'withdrawal',
          currency: 'USD',
          amount: 50,
          status: 'pending',
          reference: 'demo_withdrawal_001',
          description: 'Demo withdrawal to bank account',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString()
        }
      ]
      return mockTransactions
    }

    const offset = (page - 1) * limit
    const transactions = await db('transactions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
    
    return transactions.map(this.mapTransactionFromDB)
  }

  async getUserTransactionCount(userId: string): Promise<number> {
    // Handle demo user case
    if (userId === 'demo-user-id') {
      return 2 // Mock transaction count
    }

    const result = await db('transactions')
      .where('user_id', userId)
      .count('* as count')
      .first()
    
    return parseInt(result?.count as string) || 0
  }

  // Club operations
  async createClub(clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<Club> {
    const [club] = await db('clubs')
      .insert({
        id: uuidv4(),
        name: clubData.name,
        description: clubData.description,
        category: clubData.category,
        creator_id: clubData.creatorId,
        member_count: clubData.memberCount,
        is_private: clubData.isPrivate,
        image_url: clubData.imageUrl,
        rules: clubData.rules,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapClubFromDB(club)
  }

  async getClubById(id: string): Promise<Club | null> {
    const club = await db('clubs').where('id', id).first()
    return club ? this.mapClubFromDB(club) : null
  }

  async getClubs(): Promise<Club[]> {
    const clubs = await db('clubs')
      .orderBy('created_at', 'desc')
    
    return clubs.map(club => this.mapClubFromDB(club))
  }

  // Helper methods to map database records to schema types
  private mapUserFromDB(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      password: dbUser.password_hash,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      phone: dbUser.phone,
      dateOfBirth: dbUser.date_of_birth,
      walletAddress: dbUser.wallet_address,
      kycLevel: dbUser.kyc_level,
      walletBalance: parseFloat(dbUser.wallet_balance),
      profileImage: dbUser.profile_image_url,
      coverImage: dbUser.cover_image_url,
      bio: dbUser.bio,
      stripeCustomerId: dbUser.stripe_customer_id,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    }
  }

  private mapBetFromDB(dbBet: any): Bet {
    try {
      const mapped = {
        id: dbBet.id,
        creatorId: dbBet.creator_id,
        title: dbBet.title,
        description: dbBet.description,
        type: dbBet.type,
        category: dbBet.category,
        options: typeof dbBet.options === 'string' ? JSON.parse(dbBet.options) : dbBet.options || [],
        status: dbBet.status,
        stakeMin: parseFloat(dbBet.stake_min),
        stakeMax: parseFloat(dbBet.stake_max),
        poolTotal: dbBet.pool_total !== undefined && dbBet.pool_total !== null ? parseFloat(dbBet.pool_total) : 0,
        entryDeadline: dbBet.entry_deadline,
        settlementMethod: dbBet.settlement_method,
        isPrivate: dbBet.is_private,
        clubId: dbBet.club_id,
        likes: dbBet.likes_count !== undefined && dbBet.likes_count !== null ? dbBet.likes_count : 0,
        comments: dbBet.comments_count !== undefined && dbBet.comments_count !== null ? dbBet.comments_count : 0,
        shares: dbBet.shares_count !== undefined && dbBet.shares_count !== null ? dbBet.shares_count : 0,
        createdAt: dbBet.created_at,
        updatedAt: dbBet.updated_at
      }
      console.log('[mapBetFromDB] Mapped bet:', mapped)
      return mapped
    } catch (err) {
      console.error('[mapBetFromDB] Error mapping bet:', dbBet, err)
      throw err
    }
  }

  private mapTransactionFromDB(dbTransaction: any): Transaction {
    return {
      id: dbTransaction.id,
      userId: dbTransaction.user_id,
      type: dbTransaction.type,
      currency: dbTransaction.currency || 'USD',
      amount: parseFloat(dbTransaction.amount),
      status: dbTransaction.status,
      reference: dbTransaction.reference || '',
      description: dbTransaction.description,
      fromUserId: dbTransaction.from_user_id,
      toUserId: dbTransaction.to_user_id,
      betId: dbTransaction.bet_id,
      paymentIntentId: dbTransaction.payment_intent_id,
      createdAt: dbTransaction.created_at,
      updatedAt: dbTransaction.updated_at
    }
  }

  private mapClubFromDB(dbClub: any): Club {
    return {
      id: dbClub.id,
      name: dbClub.name,
      description: dbClub.description,
      category: dbClub.category,
      creatorId: dbClub.creator_id,
      memberCount: dbClub.member_count,
      isPrivate: dbClub.is_private,
      imageUrl: dbClub.image_url,
      rules: dbClub.rules,
      createdAt: dbClub.created_at,
      updatedAt: dbClub.updated_at
    }
  }

  // Helper for BetEntry
  private mapBetEntryFromDB(dbEntry: any): BetEntry {
    return {
      id: dbEntry.id,
      betId: dbEntry.bet_id,
      userId: dbEntry.user_id,
      optionId: dbEntry.option_id,
      amount: parseFloat(dbEntry.amount),
      odds: parseFloat(dbEntry.odds),
      potentialWinnings: parseFloat(dbEntry.potential_winnings),
      status: dbEntry.status,
      createdAt: dbEntry.created_at.toISOString(),
      updatedAt: dbEntry.updated_at.toISOString()
    }
  }

  private mapCommentFromDB(dbComment: any): Comment {
    return {
      id: dbComment.id,
      content: dbComment.content,
      authorId: dbComment.author_id,
      targetType: dbComment.target_type,
      targetId: dbComment.target_id,
      likes: dbComment.likes,
      createdAt: dbComment.created_at.toISOString(),
      updatedAt: dbComment.updated_at.toISOString()
    }
  }

  // KYC Operations
  async createKYCVerification(kycData: any): Promise<any> {
    if (!kycData.userId || typeof kycData.userId !== 'string') {
      console.error('[KYC] createKYCVerification: Missing or invalid userId:', kycData.userId)
      throw new Error('Invalid userId for KYC verification')
    }
    const [kyc] = await db('kyc_verifications')
      .insert({
        id: kycData.id,
        user_id: kycData.userId,
        first_name: kycData.firstName,
        last_name: kycData.lastName,
        date_of_birth: kycData.dateOfBirth,
        address: JSON.stringify(kycData.address),
        phone_number: kycData.phoneNumber,
        status: kycData.status,
        submitted_at: kycData.submittedAt,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapKYCVerificationFromDB(kyc)
  }

  async getKYCByUserId(userId: string): Promise<any> {
    const kyc = await db('kyc_verifications').where('user_id', userId).first()
    return kyc ? this.mapKYCVerificationFromDB(kyc) : null
  }

  async updateKYCStatus(kycId: string, status: string, rejectionReason?: string): Promise<boolean> {
    const updates: any = {
      status,
      updated_at: new Date()
    }

    if (status === 'verified') {
      updates.verified_at = new Date()
    }

    if (rejectionReason) {
      updates.rejection_reason = rejectionReason
    }

    const result = await db('kyc_verifications')
      .where('id', kycId)
      .update(updates)

    return result > 0
  }

  async updateUserKYCLevel(userId: string, kycLevel: string): Promise<boolean> {
    const updates: any = {
      kyc_level: kycLevel,
      updated_at: new Date()
    }

    if (kycLevel === 'enhanced') {
      updates.kyc_verified_at = new Date()
    }

    const result = await db('users')
      .where('id', userId)
      .update(updates)

    return result > 0
  }

  async createKYCDocument(documentData: any): Promise<any> {
    if (!documentData.userId || typeof documentData.userId !== 'string') {
      console.error('[KYC] createKYCDocument: Missing or invalid userId:', documentData.userId)
      throw new Error('Invalid userId for KYC document')
    }
    const [document] = await db('kyc_documents')
      .insert({
        id: documentData.id,
        user_id: documentData.userId,
        type: documentData.type,
        status: documentData.status,
        document_url: documentData.documentUrl,
        uploaded_at: documentData.uploadedAt,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    return this.mapKYCDocumentFromDB(document)
  }

  async getKYCDocumentsByUserId(userId: string): Promise<any[]> {
    const documents = await db('kyc_documents').where('user_id', userId)
    return documents.map(doc => this.mapKYCDocumentFromDB(doc))
  }

  async updateKYCDocumentStatus(documentId: string, status: string, rejectionReason?: string): Promise<boolean> {
    const updates: any = {
      status,
      updated_at: new Date()
    }

    if (status === 'approved') {
      updates.verified_at = new Date()
    }

    if (rejectionReason) {
      updates.rejection_reason = rejectionReason
    }

    const result = await db('kyc_documents')
      .where('id', documentId)
      .update(updates)

    return result > 0
  }

  // Helper methods for KYC
  private mapKYCVerificationFromDB(dbKYC: any): any {
    return {
      id: dbKYC.id,
      userId: dbKYC.user_id,
      firstName: dbKYC.first_name,
      lastName: dbKYC.last_name,
      dateOfBirth: dbKYC.date_of_birth,
      address: typeof dbKYC.address === 'string' ? JSON.parse(dbKYC.address) : dbKYC.address,
      phoneNumber: dbKYC.phone_number,
      status: dbKYC.status,
      submittedAt: dbKYC.submitted_at,
      verifiedAt: dbKYC.verified_at,
      rejectionReason: dbKYC.rejection_reason,
      createdAt: dbKYC.created_at,
      updatedAt: dbKYC.updated_at
    }
  }

  private mapKYCDocumentFromDB(dbDocument: any): any {
    return {
      id: dbDocument.id,
      userId: dbDocument.user_id,
      type: dbDocument.type,
      status: dbDocument.status,
      documentUrl: dbDocument.document_url,
      uploadedAt: dbDocument.uploaded_at,
      verifiedAt: dbDocument.verified_at,
      rejectionReason: dbDocument.rejection_reason,
      metadata: dbDocument.metadata,
      createdAt: dbDocument.created_at,
      updatedAt: dbDocument.updated_at
    }
  }
}

export const databaseStorage = new DatabaseStorage() 

 