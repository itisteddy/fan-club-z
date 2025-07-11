import Stripe from 'stripe'
import { config } from '../config.js'

// Initialize Stripe
const stripe = new Stripe(config.stripeSecretKey || '', {
  apiVersion: '2025-06-30.basil',
  typescript: true,
})

export interface PaymentIntentData {
  amount: number
  currency: string
  customerId?: string
  metadata?: Record<string, string>
  description?: string
}

export interface CustomerData {
  email: string
  name?: string
  phone?: string
  metadata?: Record<string, string>
}

export interface PaymentMethodData {
  type: 'card'
  card?: {
    token?: string
    number?: string
    exp_month?: number
    exp_year?: number
    cvc?: string
  }
  billing_details?: {
    name?: string
    email?: string
    phone?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      postal_code?: string
      country?: string
    }
  }
}

export class StripeService {
  /**
   * Create a payment intent for deposits
   */
  async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        customer: data.customerId,
        metadata: data.metadata,
        description: data.description,
        automatic_payment_methods: {
          enabled: true,
        },
        setup_future_usage: 'off_session', // Allow future payments
      })

      return paymentIntent
    } catch (error) {
      console.error('Error creating payment intent:', error)
      throw new Error('Failed to create payment intent')
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(data: CustomerData): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata,
      })

      return customer
    } catch (error) {
      console.error('Error creating customer:', error)
      throw new Error('Failed to create customer')
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      return customer as Stripe.Customer
    } catch (error) {
      console.error('Error retrieving customer:', error)
      throw new Error('Failed to retrieve customer')
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(customerId: string, data: Partial<CustomerData>): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.update(customerId, {
        email: data.email,
        name: data.name,
        phone: data.phone,
        metadata: data.metadata,
      })

      return customer
    } catch (error) {
      console.error('Error updating customer:', error)
      throw new Error('Failed to update customer')
    }
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(data: PaymentMethodData): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.create({
        type: data.type,
        card: data.card,
        billing_details: data.billing_details,
      })

      return paymentMethod
    } catch (error) {
      console.error('Error creating payment method:', error)
      throw new Error('Failed to create payment method')
    }
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(paymentMethodId: string, customerId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      })

      return paymentMethod
    } catch (error) {
      console.error('Error attaching payment method:', error)
      throw new Error('Failed to attach payment method')
    }
  }

  /**
   * Get customer's payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      })

      return paymentMethods.data
    } catch (error) {
      console.error('Error retrieving payment methods:', error)
      throw new Error('Failed to retrieve payment methods')
    }
  }

  /**
   * Confirm payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      })

      return paymentIntent
    } catch (error) {
      console.error('Error confirming payment intent:', error)
      throw new Error('Failed to confirm payment intent')
    }
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
      return paymentIntent
    } catch (error) {
      console.error('Error retrieving payment intent:', error)
      throw new Error('Failed to retrieve payment intent')
    }
  }

  /**
   * Create a refund
   */
  async createRefund(paymentIntentId: string, amount?: number, reason?: string): Promise<Stripe.Refund> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason: reason as 'duplicate' | 'fraudulent' | 'requested_by_customer',
      })

      return refund
    } catch (error) {
      console.error('Error creating refund:', error)
      throw new Error('Failed to create refund')
    }
  }

  /**
   * Create a transfer (for withdrawals)
   */
  async createTransfer(amount: number, currency: string, destination: string, description?: string): Promise<Stripe.Transfer> {
    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        destination,
        description,
      })

      return transfer
    } catch (error) {
      console.error('Error creating transfer:', error)
      throw new Error('Failed to create transfer')
    }
  }

  /**
   * Create a connected account for payouts
   */
  async createConnectedAccount(email: string, country: string, businessType: 'individual' | 'company'): Promise<Stripe.Account> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country,
        email,
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      })

      return account
    } catch (error) {
      console.error('Error creating connected account:', error)
      throw new Error('Failed to create connected account')
    }
  }

  /**
   * Get account link for onboarding
   */
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<Stripe.AccountLink> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      })

      return accountLink
    } catch (error) {
      console.error('Error creating account link:', error)
      throw new Error('Failed to create account link')
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, endpointSecret: string): Stripe.Event {
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
      return event
    } catch (error) {
      console.error('Error verifying webhook signature:', error)
      throw new Error('Invalid webhook signature')
    }
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy', 'chf', 'sek', 'nok', 'dkk']
  }

  /**
   * Convert amount to cents
   */
  toCents(amount: number): number {
    return Math.round(amount * 100)
  }

  /**
   * Convert cents to amount
   */
  fromCents(cents: number): number {
    return cents / 100
  }
}

// Export singleton instance
export const stripeService = new StripeService() 