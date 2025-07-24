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
        selected_option: entryData.optionId, // Fixed: using correct column name from migration
        stake_amount: entryData.amount, // Fixed: using correct column name from migration
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

  async getUserBetEntries(userId: string): Promise<any[]> {
    // Get bet entries from database
    try {
      const entries = await db('bet_entries')
        .join('bets', 'bet_entries.bet_id', 'bets.id')
        .where('bet_entries.user_id', userId)
        .select(
          'bet_entries.*',
          'bets.title as bet_title',
          'bets.description as bet_description',
          'bets.status as bet_status',
          'bets.pool_total as bet_pool_total',
          'bets.entry_deadline as bet_entry_deadline'
        )
        .orderBy('bet_entries.created_at', 'desc')
      
      return entries.map(entry => ({
        id: entry.id,
        betId: entry.bet_id,
        bet: {
          id: entry.bet_id,
          title: entry.bet_title,
          description: entry.bet_description,
          status: entry.bet_status,
          poolTotal: parseFloat(entry.bet_pool_total || '0'),
          entryDeadline: entry.bet_entry_deadline
        },
        selectedOption: entry.selected_option,
        stakeAmount: parseFloat(entry.stake_amount),
        potentialWinnings: parseFloat(entry.potential_winnings),
        status: entry.status,
        createdAt: entry.created_at
      }))
    } catch (error) {
      console.error('Error fetching user bet entries:', error)
      return []
    }
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
        likes_count: 0, // Fixed: using correct column name
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
    // Get user's current balance for balance tracking
    const user = await this.getUserById(txData.userId)
    const currentBalance = user?.walletBalance || 0
    
    // Map transaction type to database enum values
    let dbTransactionType = txData.type
    if (txData.type === 'bet_lock') {
      dbTransactionType = 'bet_placed' // Use the enum value from migration
    }

    const [tx] = await db('transactions')
      .insert({
        id: uuidv4(),
        user_id: txData.userId,
        type: dbTransactionType,
        amount: txData.amount,
        balance_before: currentBalance,
        balance_after: dbTransactionType === 'bet_placed' ? currentBalance - txData.amount : currentBalance + txData.amount,
        status: txData.status,
        reference_id: txData.reference,
        description: txData.description,
        metadata: JSON.stringify({
          betId: txData.betId,
          paymentIntentId: txData.paymentIntentId
        }),
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
    const offset = (page - 1) * limit
    const transactions = await db('transactions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
    
    return transactions.map(this.mapTransactionFromDB)
  }

  async getUserTransactionCount(userId: string): Promise<number> {
    const result = await db('transactions')
      .where('user_id', userId)
      .count('* as count')
      .first()
    
    return parseInt(result?.count as string) || 0
  }

  // Club operations
  async createClub(clubData: Omit<Club, 'id' | 'createdAt' | 'updatedAt'>): Promise<Club> {
    const clubId = uuidv4()
    
    // Create the club
    const [club] = await db('clubs')
      .insert({
        id: clubId,
        name: clubData.name,
        description: clubData.description,
        category: clubData.category,
        creator_id: clubData.creatorId,
        member_count: clubData.memberCount || 1,
        is_private: clubData.isPrivate,
        image_url: clubData.imageUrl,
        rules: clubData.rules,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*')

    // Create creator membership
    try {
      await db('club_memberships')
        .insert({
          id: uuidv4(),
          club_id: clubId,
          user_id: clubData.creatorId,
          role: 'owner',
          status: 'active',
          joined_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        })
    } catch (membershipError) {
      console.warn('Failed to create creator membership:', membershipError)
      // Don't fail the entire club creation if membership fails
    }

    return this.mapClubFromDB(club)
  }

  async getClubById(id: string): Promise<Club | null> {
    const club = await db('clubs').where('id', id).first()
    return club ? this.mapClubFromDB(club) : null
  }

  async getClubs(): Promise<Club[]> {
    try {
      const clubs = await db('clubs')
        .orderBy('created_at', 'desc')
      
      return clubs.map(club => this.mapClubFromDB(club))
    } catch (error) {
      console.error('Error fetching clubs:', error)
      return []
    }
  }

  async getClubsByUserId(userId: string): Promise<Club[]> {
    try {
      // Get clubs where the user is a member (including creator)
      const clubs = await db('clubs')
        .join('club_memberships', 'clubs.id', 'club_memberships.club_id')
        .where('club_memberships.user_id', userId)
        .where('club_memberships.status', 'active')
        .select('clubs.*', 'club_memberships.role as membership_role')
        .orderBy('clubs.created_at', 'desc')
      
      return clubs.map(club => this.mapClubFromDB(club))
    } catch (error) {
      console.error('Error fetching user clubs:', error)
      // Fallback to creator-only clubs
      try {
        const creatorClubs = await db('clubs')
          .where('creator_id', userId)
          .orderBy('created_at', 'desc')
        return creatorClubs.map(club => this.mapClubFromDB(club))
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError)
        return []
      }
    }
  }

  async joinClub(userId: string, clubId: string): Promise<boolean> {
    try {
      // Check if user is already a member
      const existingMembership = await db('club_memberships')
        .where('club_id', clubId)
        .where('user_id', userId)
        .first()
      
      if (existingMembership) {
        // If they left before, reactivate membership
        if (existingMembership.status === 'left') {
          await db('club_memberships')
            .where('id', existingMembership.id)
            .update({
              status: 'active',
              joined_at: new Date(),
              left_at: null,
              updated_at: new Date()
            })
        } else {
          // Already an active member
          return true
        }
      } else {
        // Create new membership
        await db('club_memberships')
          .insert({
            id: uuidv4(),
            club_id: clubId,
            user_id: userId,
            role: 'member',
            status: 'active',
            joined_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
          })
      }
      
      // Update club member count
      await db('clubs')
        .where('id', clubId)
        .increment('member_count', 1)
      
      return true
    } catch (error) {
      console.error('Error joining club:', error)
      return false
    }
  }

  async leaveClub(userId: string, clubId: string): Promise<boolean> {
    try {
      // Check if user is a member
      const membership = await db('club_memberships')
        .where('club_id', clubId)
        .where('user_id', userId)
        .where('status', 'active')
        .first()
      
      if (!membership) {
        // User is not an active member
        return false
      }
      
      // Check if user is the creator/owner
      const club = await db('clubs').where('id', clubId).first()
      if (club && club.creator_id === userId) {
        // Creator cannot leave their own club (would need to transfer ownership)
        return false
      }
      
      // Update membership status to 'left'
      await db('club_memberships')
        .where('id', membership.id)
        .update({
          status: 'left',
          left_at: new Date(),
          updated_at: new Date()
        })
      
      // Decrement club member count
      await db('clubs')
        .where('id', clubId)
        .where('member_count', '>', 0) // Prevent negative counts
        .decrement('member_count', 1)
      
      return true
    } catch (error) {
      console.error('Error leaving club:', error)
      return false
    }
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
    // Parse metadata if it exists
    let metadata = {}
    try {
      metadata = dbTransaction.metadata ? JSON.parse(dbTransaction.metadata) : {}
    } catch (e) {
      console.warn('Failed to parse transaction metadata:', e)
    }
    
    // Map database transaction type back to schema type
    let transactionType = dbTransaction.type
    if (dbTransaction.type === 'bet_placed') {
      transactionType = 'bet_lock' // Map back to schema enum value
    }
    
    return {
      id: dbTransaction.id,
      userId: dbTransaction.user_id,
      type: transactionType, // Fixed: mapped type
      currency: 'USD', // Default currency
      amount: parseFloat(dbTransaction.amount),
      status: dbTransaction.status,
      reference: dbTransaction.reference_id || '', // Fixed: using correct column name
      description: dbTransaction.description,
      fromUserId: undefined, // Not stored in current schema
      toUserId: undefined, // Not stored in current schema  
      betId: (metadata as any)?.betId, // From metadata
      paymentIntentId: (metadata as any)?.paymentIntentId, // From metadata
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
      memberCount: dbClub.member_count || 0,
      activeBets: dbClub.active_bets || 0,
      discussions: dbClub.discussions || 0,
      isPrivate: dbClub.is_private || false,
      imageUrl: dbClub.image_url,
      rules: dbClub.rules,
      createdAt: dbClub.created_at,
      updatedAt: dbClub.updated_at
    }
  }

  // Helper for BetEntry
  private mapBetEntryFromDB(dbEntry: any): BetEntry {
    // Debug logging to see what we're getting from the database
    console.log('🔍 mapBetEntryFromDB - dbEntry.created_at type:', typeof dbEntry.created_at, 'value:', dbEntry.created_at)
    console.log('🔍 mapBetEntryFromDB - dbEntry.updated_at type:', typeof dbEntry.updated_at, 'value:', dbEntry.updated_at)
    
    // Safe date handling
    const formatDate = (dateValue: any): string => {
      if (typeof dateValue === 'string') {
        return dateValue
      }
      if (dateValue instanceof Date) {
        return dateValue.toISOString()
      }
      if (dateValue && typeof dateValue === 'object' && dateValue.toISOString) {
        return dateValue.toISOString()
      }
      if (typeof dateValue === 'number') {
        // Handle numeric timestamps (milliseconds since epoch)
        return new Date(dateValue).toISOString()
      }
      // Fallback to current date if we can't parse it
      console.warn('⚠️ Could not parse date value:', dateValue, 'using current date')
      return new Date().toISOString()
    }
    
    return {
      id: dbEntry.id,
      betId: dbEntry.bet_id,
      userId: dbEntry.user_id,
      optionId: dbEntry.selected_option, // Fixed: using correct column name from migration
      amount: parseFloat(dbEntry.stake_amount), // Fixed: using correct column name from migration
      odds: parseFloat(dbEntry.odds || 1.5), // Default odds if not set
      potentialWinnings: parseFloat(dbEntry.potential_winnings),
      status: dbEntry.status,
      createdAt: formatDate(dbEntry.created_at),
      updatedAt: formatDate(dbEntry.updated_at)
    }
  }

  private mapCommentFromDB(dbComment: any): Comment {
    // Safe date handling
    const formatDate = (dateValue: any): string => {
      if (typeof dateValue === 'string') {
        return dateValue
      }
      if (dateValue instanceof Date) {
        return dateValue.toISOString()
      }
      if (dateValue && typeof dateValue === 'object' && dateValue.toISOString) {
        return dateValue.toISOString()
      }
      if (typeof dateValue === 'number') {
        // Handle numeric timestamps (milliseconds since epoch)
        return new Date(dateValue).toISOString()
      }
      // Fallback to current date if we can't parse it
      console.warn('⚠️ Could not parse date value:', dateValue, 'using current date')
      return new Date().toISOString()
    }
    
    return {
      id: dbComment.id,
      content: dbComment.content,
      authorId: dbComment.author_id,
      targetType: dbComment.target_type,
      targetId: dbComment.target_id,
      likes: dbComment.likes_count || 0, // Fixed: reading from correct column
      createdAt: formatDate(dbComment.created_at),
      updatedAt: formatDate(dbComment.updated_at)
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

  // Method aliases for route compatibility
  async getBetEntriesByUserId(userId: string): Promise<BetEntry[]> {
    return this.getBetEntriesByUser(userId);
  }

  async getCommentsByBetId(betId: string): Promise<Comment[]> {
    return this.getCommentsByBet(betId);
  }

  async getTransactionsByUserId(userId: string): Promise<Transaction[]> {
    return this.getTransactionsByUser(userId);
  }

  // Bet reaction handling
  async handleBetReaction(userId: string, betId: string, type: 'like' | 'unlike'): Promise<{ isLiked: boolean; totalLikes: number }> {
    // For now, implement a simple in-memory reaction system
    // In production, this would use a proper database table
    
    // Mock implementation for MVP
    const isLiked = type === 'like';
    const totalLikes = Math.floor(Math.random() * 50) + (isLiked ? 1 : 0); // Mock count
    
    return {
      isLiked,
      totalLikes
    };
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

 