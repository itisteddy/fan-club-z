import { databaseStorage } from './databaseStorage.js'

export interface KYCDocument {
  id: string
  userId: string
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill'
  status: 'pending' | 'approved' | 'rejected'
  documentUrl: string
  uploadedAt: string
  verifiedAt?: string
  rejectionReason?: string
}

export interface KYCVerification {
  id: string
  userId: string
  firstName: string
  lastName: string
  dateOfBirth: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  phoneNumber: string
  status: 'pending' | 'verified' | 'rejected'
  submittedAt: string
  verifiedAt?: string
  rejectionReason?: string
}

export class KYCService {
  // Submit KYC verification
  async submitKYC(userId: string, verificationData: Omit<KYCVerification, 'id' | 'userId' | 'status' | 'submittedAt'>) {
    try {
      // Handle demo user case
      if (userId === 'demo-user-id') {
        return {
          success: true,
          kycId: 'demo-kyc-id',
          status: 'pending',
          submittedAt: new Date().toISOString(),
        }
      }

      // Check if user already has a KYC verification
      const existingKYC = await databaseStorage.getKYCByUserId(userId)
      
      if (existingKYC) {
        // Allow resubmission if previous was rejected
        if (existingKYC.status === 'rejected') {
          console.log(`Allowing resubmission for user ${userId} - previous status was rejected`)
          // Update existing KYC with new data
          await databaseStorage.updateKYCStatus(existingKYC.id, 'pending')
          return {
            success: true,
            kycId: existingKYC.id,
            status: 'pending',
            submittedAt: new Date().toISOString(),
          }
        } else if (existingKYC.status === 'pending') {
          throw new Error('KYC verification already submitted and is being reviewed')
        } else if (existingKYC.status === 'verified') {
          throw new Error('KYC verification already completed')
        }
      }

      // Create new KYC verification
      const kycVerification: KYCVerification = {
        id: crypto.randomUUID(),
        userId,
        firstName: verificationData.firstName,
        lastName: verificationData.lastName,
        dateOfBirth: verificationData.dateOfBirth,
        address: verificationData.address,
        phoneNumber: verificationData.phoneNumber,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      }

      // Store in database
      await databaseStorage.createKYCVerification(kycVerification)

      return {
        success: true,
        kycId: kycVerification.id,
        status: 'pending',
        submittedAt: kycVerification.submittedAt,
      }
    } catch (error: any) {
      console.error('KYC submission failed:', error)
      throw new Error(error.message || 'Failed to submit KYC verification')
    }
  }

  // Upload KYC document
  async uploadDocument(userId: string, documentType: KYCDocument['type'], documentUrl: string) {
    try {
      // Handle demo user case
      if (userId === 'demo-user-id') {
        return {
          success: true,
          documentId: 'demo-doc-id',
          status: 'pending',
        }
      }
      if (!userId || typeof userId !== 'string') {
        console.error('[KYC] uploadDocument: Missing or invalid userId:', userId)
        throw new Error('Invalid userId for KYC document upload')
      }
      // Validate document type
      const validTypes = ['passport', 'drivers_license', 'national_id', 'utility_bill']
      if (!validTypes.includes(documentType)) {
        throw new Error('Invalid document type')
      }

      // Create document record
      const document: KYCDocument = {
        id: crypto.randomUUID(),
        userId,
        type: documentType,
        status: 'pending',
        documentUrl,
        uploadedAt: new Date().toISOString(),
      }

      // Store in database
      await databaseStorage.createKYCDocument(document)

      return {
        success: true,
        documentId: document.id,
        status: 'pending',
      }
    } catch (error: any) {
      console.error('Document upload failed:', error)
      throw new Error(error.message || 'Failed to upload document')
    }
  }

  // Get KYC status for user
  async getKYCStatus(userId: string) {
    try {
      // Handle demo user case
      if (userId === 'demo-user-id') {
        return {
          kycLevel: 'enhanced',
          status: 'verified',
          verification: null,
          documents: [],
        }
      }

      const user = await databaseStorage.getUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Get KYC verification
      const kycVerification = await databaseStorage.getKYCByUserId(userId)
      const documents = await databaseStorage.getKYCDocumentsByUserId(userId)

      return {
        kycLevel: user.kycLevel,
        status: user.kycLevel === 'enhanced' ? 'verified' : 'pending',
        verification: kycVerification,
        documents: documents || [],
      }
    } catch (error: any) {
      console.error('Failed to get KYC status:', error)
      throw new Error('Failed to retrieve KYC status')
    }
  }

  // Get KYC verification by user ID
  async getKYCByUserId(userId: string): Promise<KYCVerification | null> {
    try {
      return await databaseStorage.getKYCByUserId(userId)
    } catch (error: any) {
      console.error('Failed to get KYC verification:', error)
      return null
    }
  }

  // Get KYC documents by user ID
  async getKYCDocumentsByUserId(userId: string): Promise<KYCDocument[]> {
    try {
      return await databaseStorage.getKYCDocumentsByUserId(userId)
    } catch (error: any) {
      console.error('Failed to get KYC documents:', error)
      return []
    }
  }

  // Verify KYC (admin function)
  async verifyKYC(kycId: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    try {
      // Get KYC verification
      const kycVerification = await databaseStorage.getKYCByUserId(kycId)
      if (!kycVerification) {
        throw new Error('KYC verification not found')
      }

      // Update KYC status
      await databaseStorage.updateKYCStatus(kycId, status, rejectionReason)

      // Update user KYC level
      const newKYCLevel = status === 'approved' ? 'enhanced' : 'basic'
      await databaseStorage.updateUserKYCLevel(kycVerification.userId, newKYCLevel)

      return {
        success: true,
        status,
        verifiedAt: new Date().toISOString(),
      }
    } catch (error: any) {
      console.error('KYC verification failed:', error)
      throw new Error(error.message || 'Failed to verify KYC')
    }
  }

  // Check KYC requirements for betting limits
  async checkKYCLimits(userId: string, betAmount: number) {
    try {
      // Handle demo user case
      if (userId === 'demo-user-id') {
        const maxBet = 10000 // Enhanced KYC level for demo user
        const allowed = betAmount <= maxBet
        
        return {
          allowed,
          maxBet,
          currentKYCLevel: 'enhanced',
        }
      }

      const user = await databaseStorage.getUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Define limits based on KYC level
      const limits = {
        none: 100,      // $100 max bet without KYC
        basic: 500,     // $500 max bet with basic KYC
        enhanced: 10000, // $10,000 max bet with enhanced KYC
      }

      const maxBet = limits[user.kycLevel] || 0

      if (betAmount > maxBet) {
        throw new Error(`Bet amount exceeds limit for your KYC level. Maximum: $${maxBet}`)
      }

      return {
        allowed: true,
        maxBet,
        currentKYCLevel: user.kycLevel,
      }
    } catch (error: any) {
      console.error('KYC limit check failed:', error)
      throw new Error(error.message || 'Failed to check KYC limits')
    }
  }

  // Get KYC requirements for user
  async getKYCRequirements(userId: string) {
    try {
      // Handle demo user case
      if (userId === 'demo-user-id') {
        return {
          required: false,
          documents: [],
          description: 'Your identity is verified',
        }
      }

      const user = await databaseStorage.getUserById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const requirements = {
        none: {
          required: true,
          documents: ['government_id', 'proof_of_address'],
          description: 'Required for betting over $100',
        },
        basic: {
          required: false,
          documents: [],
          description: 'Your verification is being processed',
        },
        enhanced: {
          required: false,
          documents: [],
          description: 'Your identity is verified',
        },
      }

      return requirements[user.kycLevel] || requirements.none
    } catch (error: any) {
      console.error('Failed to get KYC requirements:', error)
      throw new Error('Failed to retrieve KYC requirements')
    }
  }
}

export const kycService = new KYCService() 