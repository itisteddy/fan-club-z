import express from 'express'
import { z } from 'zod'
import { authenticateToken } from '../middleware/auth.js'
import { kycService } from '../services/kycService.js'

const router = express.Router()

// KYC submission schema
const kycSubmissionSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().min(1, 'Country is required'),
  }),
  phoneNumber: z.string().min(1, 'Phone number is required'),
})

// Document upload schema
const documentUploadSchema = z.object({
  documentType: z.enum(['passport', 'drivers_license', 'national_id', 'utility_bill']),
  documentUrl: z.string().url('Valid document URL is required'),
})

/**
 * GET /api/kyc/status
 * Get KYC status for the authenticated user
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Status Request - User ID:', req.user?.id, 'User object:', req.user)
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      })
    }

    const status = await kycService.getKYCStatus(req.user.id)
    res.json({
      success: true,
      ...status
    })
  } catch (error: any) {
    console.error('Failed to get KYC status:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve KYC status'
    })
  }
})

/**
 * GET /api/kyc/requirements
 * Get KYC requirements for the authenticated user
 */
router.get('/requirements', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Requirements Request - User ID:', req.user?.id)
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      })
    }

    const requirements = await kycService.getKYCRequirements(req.user.id)
    res.json({
      success: true,
      ...requirements
    })
  } catch (error: any) {
    console.error('Failed to get KYC requirements:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve KYC requirements'
    })
  }
})

/**
 * POST /api/kyc/submit
 * Submit KYC verification for the authenticated user
 */
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Submit Request - User ID:', req.user?.id, 'Body:', req.body)
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      })
    }

    const verificationData = kycSubmissionSchema.parse(req.body)

    const result = await kycService.submitKYC(req.user.id, verificationData)
    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('KYC submission failed:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to submit KYC'
    })
  }
})

/**
 * POST /api/kyc/upload-document
 * Upload a document for KYC verification
 */
router.post('/upload-document', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Document Upload Request - User ID:', req.user?.id, 'Body:', req.body)
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      })
    }

    const { documentType, documentUrl } = documentUploadSchema.parse(req.body)
    
    const result = await kycService.uploadDocument(req.user.id, documentType, documentUrl)
    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('Document upload failed:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      })
    }
    
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload document'
    })
  }
})

/**
 * GET /api/kyc/verification
 * Get KYC verification details for the authenticated user
 */
router.get('/verification', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Verification Request - User ID:', req.user?.id)
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      })
    }

    const verification = await kycService.getKYCByUserId(req.user.id)
    res.json({
      success: true,
      verification
    })
  } catch (error: any) {
    console.error('Failed to get KYC verification:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve KYC verification'
    })
  }
})

/**
 * POST /api/kyc/check-limits
 * Check if a bet amount is within KYC limits
 */
router.post('/check-limits', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Limits Check Request - User ID:', req.user?.id, 'Body:', req.body)
    
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in token'
      })
    }

    const { betAmount } = req.body

    if (typeof betAmount !== 'number' || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid bet amount is required'
      })
    }

    const result = await kycService.checkKYCLimits(req.user.id, betAmount)
    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('KYC limit check failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to check KYC limits'
    })
  }
})

/**
 * POST /api/kyc/verify/:kycId
 * Verify KYC (admin function)
 */
router.post('/verify/:kycId', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 KYC Verify Request - User ID:', req.user?.id, 'KYC ID:', req.params.kycId)
    
    if (!req.user?.id) {
      return res.status(401).json({
      success: false,
        error: 'User ID not found in token'
    })
  }

    const { kycId } = req.params
    const { status, rejectionReason } = req.body

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "approved" or "rejected"'
      })
    }

    const result = await kycService.verifyKYC(kycId, status, rejectionReason)
    res.json({
      success: true,
      ...result
    })
  } catch (error: any) {
    console.error('KYC verification failed:', error)
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to verify KYC'
    })
  }
})

export default router 