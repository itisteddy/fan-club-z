import { Router, Request, Response } from 'express'
import { stripeService } from '../services/stripeService.js'
import { databaseStorage } from '../services/databaseStorage.js'
import { authenticateToken } from '../middleware/auth.js'
import { 
  validateWalletTransaction, 
  handleValidationErrors,
  sanitizeInput,
  xssProtection 
} from '../middleware/validation.js'

const router = Router()

// Create payment intent for deposit
router.post('/create-payment-intent', 
  authenticateToken, 
  sanitizeInput, 
  xssProtection, 
  validateWalletTransaction, 
  handleValidationErrors,
  async (req: Request, res: Response) => {
  try {
      const { amount, currency, paymentMethod } = req.body
      const userId = req.user.id

      // Get or create Stripe customer
      let customerId = req.user.stripeCustomerId
      if (!customerId) {
        const customer = await stripeService.createCustomer({
          email: req.user.email,
          name: `${req.user.firstName} ${req.user.lastName}`,
          phone: req.user.phone,
          metadata: {
            userId: userId,
            username: req.user.username
          }
        })
        
        // Update user with Stripe customer ID
        await databaseStorage.updateUser(userId, {
          stripeCustomerId: customer.id
        })
        
        customerId = customer.id
      }

      // Create payment intent
      const paymentIntent = await stripeService.createPaymentIntent({
        amount,
        currency,
        customerId,
        metadata: {
          userId,
          type: 'deposit',
          paymentMethod: paymentMethod || 'card'
        },
        description: `Deposit to Fan Club Z wallet - ${req.user.username}`
      })

    res.json({
      success: true,
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: stripeService.fromCents(paymentIntent.amount),
          currency: paymentIntent.currency,
          status: paymentIntent.status
        }
    })
  } catch (error: any) {
      console.error('Error creating payment intent:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create payment intent'
      })
    }
  }
)

// Confirm payment intent
router.post('/confirm-payment', 
  authenticateToken, 
  sanitizeInput, 
  xssProtection,
  async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, paymentMethodId } = req.body
      const userId = req.user.id

      // Confirm payment intent
      const paymentIntent = await stripeService.confirmPaymentIntent(paymentIntentId, paymentMethodId)

      if (paymentIntent.status === 'succeeded') {
        // Update user's wallet balance
        const amount = stripeService.fromCents(paymentIntent.amount)
        const currency = paymentIntent.currency
        
        // For demo user, just return success
        if (userId === 'demo-user-id') {
          return res.json({
            success: true,
            data: {
              paymentIntentId: paymentIntent.id,
              amount,
              currency,
              status: paymentIntent.status,
              message: 'Payment confirmed successfully'
            }
          })
        }

        // For real users, update database
        const updatedUser = await databaseStorage.updateUser(userId, {
          walletBalance: (req.user.walletBalance || 0) + amount
        })

        // Record transaction
        await databaseStorage.createTransaction({
          userId,
          type: 'deposit',
          amount,
          currency: currency as 'USD' | 'NGN' | 'USDT' | 'ETH' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'SEK' | 'NOK' | 'DKK',
          status: 'completed',
          reference: paymentIntent.id,
          description: 'Wallet deposit'
        })

        res.json({
          success: true,
          data: {
            paymentIntentId: paymentIntent.id,
            amount,
            currency,
            status: paymentIntent.status,
            newBalance: updatedUser?.walletBalance || 0,
            message: 'Payment confirmed and wallet updated'
          }
        })
      } else {
    res.status(400).json({
      success: false,
          error: 'Payment not successful',
          status: paymentIntent.status
        })
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to confirm payment'
    })
  }
  }
)

// Get payment methods for user
router.get('/payment-methods', 
  authenticateToken,
  async (req: Request, res: Response) => {
  try {
      const userId = req.user.id
      const customerId = req.user.stripeCustomerId

      if (!customerId) {
        return res.json({
          success: true,
          data: {
            paymentMethods: []
          }
        })
      }

      const paymentMethods = await stripeService.getCustomerPaymentMethods(customerId)

      res.json({
        success: true,
        data: {
          paymentMethods: paymentMethods.map(pm => ({
            id: pm.id,
            type: pm.type,
            card: pm.card ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year
            } : null,
            billingDetails: pm.billing_details
          }))
        }
      })
    } catch (error: any) {
      console.error('Error getting payment methods:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get payment methods'
      })
    }
  }
)

// Add payment method
router.post('/payment-methods', 
  authenticateToken,
  sanitizeInput,
  xssProtection,
  async (req: Request, res: Response) => {
    try {
      const { paymentMethodId } = req.body
      const userId = req.user.id
      const customerId = req.user.stripeCustomerId

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'No Stripe customer found'
      })
    }

      // Attach payment method to customer
      const paymentMethod = await stripeService.attachPaymentMethod(paymentMethodId, customerId)

    res.json({
      success: true,
        data: {
          paymentMethod: {
            id: paymentMethod.id,
            type: paymentMethod.type,
            card: paymentMethod.card ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year
            } : null
          },
          message: 'Payment method added successfully'
        }
    })
  } catch (error: any) {
      console.error('Error adding payment method:', error)
      res.status(500).json({
      success: false,
        error: 'Failed to add payment method'
    })
  }
  }
)

// Process withdrawal
router.post('/withdraw', 
  authenticateToken, 
  sanitizeInput, 
  xssProtection, 
  validateWalletTransaction, 
  handleValidationErrors,
  async (req: Request, res: Response) => {
  try {
      const { amount, currency, destination } = req.body
      const userId = req.user.id

      // Check if user has sufficient balance
      if (req.user.walletBalance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient wallet balance'
        })
      }

      // For demo user, just return success
      if (userId === 'demo-user-id') {
        return res.json({
          success: true,
          data: {
            amount,
            currency,
            status: 'pending',
            message: 'Withdrawal request submitted'
          }
        })
      }

      // Create transfer (this would require a connected account setup)
      // For now, we'll just update the wallet balance
      const updatedUser = await databaseStorage.updateUser(userId, {
        walletBalance: req.user.walletBalance - amount
      })

      // Record transaction
      await databaseStorage.createTransaction({
        userId,
        type: 'withdrawal',
        amount,
        currency: currency as 'USD' | 'NGN' | 'USDT' | 'ETH' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CHF' | 'SEK' | 'NOK' | 'DKK',
        status: 'pending',
        reference: `withdrawal_${Date.now()}`,
        description: `Withdrawal to ${destination}`
      })

    res.json({
      success: true,
        data: {
          amount,
          currency,
          status: 'pending',
          newBalance: updatedUser?.walletBalance || 0,
          message: 'Withdrawal request submitted successfully'
        }
    })
  } catch (error: any) {
      console.error('Error processing withdrawal:', error)
      res.status(500).json({
      success: false,
        error: 'Failed to process withdrawal'
    })
    }
  }
)

// Get transaction history
router.get('/transactions', 
  authenticateToken,
  async (req: Request, res: Response) => {
  try {
      const userId = req.user.id
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20

      // For demo user, return mock data
      if (userId === 'demo-user-id') {
        const mockTransactions = [
          {
            id: 'txn_1',
            type: 'deposit',
            amount: 100,
            currency: 'USD',
            status: 'completed',
            createdAt: new Date().toISOString(),
            description: 'Wallet deposit'
          },
          {
            id: 'txn_2',
            type: 'withdrawal',
            amount: 50,
            currency: 'USD',
            status: 'pending',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            description: 'Withdrawal to bank account'
          }
        ]

        return res.json({
          success: true,
          data: {
            transactions: mockTransactions,
            pagination: {
              page,
      limit,
              total: mockTransactions.length,
              pages: 1
            }
          }
        })
      }

      // For real users, get from database
      const transactions = await databaseStorage.getUserTransactions(userId, page, limit)
      const total = await databaseStorage.getUserTransactionCount(userId)

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
            page,
          limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
    })
  } catch (error: any) {
      console.error('Error getting transactions:', error)
    res.status(500).json({
      success: false,
        error: 'Failed to get transactions'
    })
  }
  }
)

// Webhook handler for Stripe events
router.post('/webhook', 
  async (req: Request, res: Response) => {
    try {
      const sig = req.headers['stripe-signature'] as string
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!endpointSecret) {
        console.error('Stripe webhook secret not configured')
        return res.status(400).json({ error: 'Webhook secret not configured' })
    }

    // Verify webhook signature
      const event = stripeService.verifyWebhookSignature(
        JSON.stringify(req.body),
        sig,
        endpointSecret
      )

      // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
          await handlePaymentIntentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object)
          break
        case 'transfer.created':
          await handleTransferCreated(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error: any) {
      console.error('Webhook error:', error)
      res.status(400).json({ error: 'Webhook error' })
    }
  }
)

// Helper functions for webhook handlers
async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Payment succeeded:', paymentIntent.id)
  // Additional processing can be added here
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('Payment failed:', paymentIntent.id)
  // Additional processing can be added here
}

async function handleTransferCreated(transfer: any) {
  console.log('Transfer created:', transfer.id)
  // Additional processing can be added here
}

export default router 