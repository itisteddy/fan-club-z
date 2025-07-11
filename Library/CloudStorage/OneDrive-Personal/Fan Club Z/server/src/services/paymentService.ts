import { databaseStorage } from './databaseStorage.js'

export class PaymentService {
  // Create a payment intent for deposits (mock)
  async createDepositIntent(userId: string, amount: number, currency: string = 'usd') {
    // Validate amount (minimum $1, maximum $10,000)
    if (amount < 100) {
      throw new Error('Minimum deposit amount is $1.00')
    }
    if (amount > 1000000) {
      throw new Error('Maximum deposit amount is $10,000.00')
    }
    // Credit user's wallet immediately (paper money)
    await databaseStorage.updateUserBalance(userId, amount / 100)
    // Create transaction record
    const tx = await databaseStorage.createTransaction({
      userId,
      type: 'deposit',
      currency: currency.toUpperCase() as any,
      amount: amount / 100,
      status: 'completed',
      reference: `mock_payment_intent_${Date.now()}`,
      description: `Demo deposit (paper money)`
    })
    return {
      clientSecret: 'mock_client_secret',
      paymentIntentId: tx.reference,
    }
  }

  // Confirm payment and credit user's wallet (mock, always succeeds)
  async confirmDeposit(paymentIntentId: string) {
    // In mock mode, always succeed
    return {
      success: true,
      amount: 0, // Already credited in createDepositIntent
      userId: 'mock',
    }
  }

  // Create withdrawal request (mock)
  async createWithdrawalRequest(userId: string, amount: number, destination: string) {
    if (amount < 5) {
      throw new Error('Minimum withdrawal amount is $5.00')
    }
    if (amount > 10000) {
      throw new Error('Maximum withdrawal amount is $10,000.00')
    }
    // Check user balance
    const user = await databaseStorage.getUserById(userId)
    if (!user || user.walletBalance < amount) {
      throw new Error('Insufficient balance')
    }
    // Deduct from user's wallet immediately
    await databaseStorage.updateUserBalance(userId, -amount)
    // Create transaction record
    const tx = await databaseStorage.createTransaction({
      userId,
      type: 'withdraw',
      currency: 'USD',
      amount,
      status: 'completed',
      reference: `mock_transfer_${Date.now()}`,
      description: `Demo withdrawal (paper money)`
    })
    return {
      transferId: tx.reference,
      amount,
      status: 'completed',
    }
  }

  // Get payment methods for a user (stub)
  async getPaymentMethods(userId: string) {
    return []
  }

  // Validate payment method (stub)
  async validatePaymentMethod(paymentMethodId: string) {
    return {
      valid: true,
      type: 'mock',
      last4: '0000',
      brand: 'Mock',
    }
  }

  // Get transaction history
  async getTransactionHistory(userId: string, limit: number = 50, offset: number = 0) {
    const transactions = await databaseStorage.getTransactionsByUser(userId)
    return transactions.slice(offset, offset + limit)
  }
}

export const paymentService = new PaymentService() 