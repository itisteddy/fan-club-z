# Phase 7: Paystack Fiat Integration - Setup Guide

## Overview

This document provides the complete setup instructions for Phase 7 (Paystack fiat integration), including environment variables, webhook URLs, and callback URLs.

## Environment Variables

### Required Server Environment Variables

Add these to your server `.env` file:

```bash
# Paystack API Keys (from Paystack Dashboard)
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx  # Test secret key
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx  # Test public key (optional for client)

# Paystack Configuration
PAYSTACK_CALLBACK_URL=https://app.fanclubz.app/wallet?deposit=return
PAYSTACK_WEBHOOK_SECRET=sk_test_xxxxxxxxxxxxxxxxxxxxx  # Can reuse secret key

# Feature Flags
FIAT_PAYSTACK_ENABLED=true  # Enable fiat deposits/staking
PAYSTACK_TRANSFER_ENABLED=true  # Enable automatic transfers (set to false for manual approval only)

# Treasury User ID (for platform fees)
PLATFORM_TREASURY_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx  # Optional: UUID of treasury user
```

### Client Environment Variables (Optional)

If you need to expose Paystack status to the client:

```bash
# Client .env (optional - status endpoint is public)
VITE_PAYSTACK_ENABLED=true  # Feature flag for UI
```

## Webhook Configuration

### Paystack Webhook URL

**Production:**
```
https://api.fanclubz.app/api/v2/fiat/paystack/webhook
```

**Development/Staging:**
```
https://your-render-app.onrender.com/api/v2/fiat/paystack/webhook
```

### How to Configure in Paystack Dashboard

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to **Settings** → **API Keys & Webhooks**
3. Under **Test Webhook URL**, enter:
   ```
   https://your-server-domain.com/api/v2/fiat/paystack/webhook
   ```
4. Click **Save changes**

**Important:** 
- Paystack will send a test webhook immediately after saving
- The webhook uses HMAC-SHA512 signature verification with your `PAYSTACK_SECRET_KEY`
- The route uses raw body parsing to verify signatures correctly

## Callback URL Configuration

### Paystack Callback URL

**Production:**
```
https://app.fanclubz.app/wallet?deposit=return
```

**Development:**
```
http://localhost:5173/wallet?deposit=return
```

### How to Configure in Paystack Dashboard

1. Go to **Settings** → **API Keys & Webhooks**
2. Under **Test Callback URL**, enter:
   ```
   https://app.fanclubz.app/wallet?deposit=return
   ```
3. Click **Save changes**

**Note:** This URL is where users are redirected after completing payment on Paystack.

## API Endpoints

### Public Endpoints

#### Check Fiat Status
```
GET /api/v2/fiat/paystack/status
```
Returns: `{ enabled: boolean, currency: string, minDepositNgn: number }`

#### Get Nigerian Banks List
```
GET /api/v2/fiat/paystack/banks
```
Returns: `{ banks: Array<{ name, code, slug }> }`

### User Endpoints (Authenticated)

#### Initialize Deposit
```
POST /api/v2/fiat/paystack/initialize
Body: { amountNgn: number, userId: string, email?: string }
Returns: { authorizationUrl: string, reference: string }
```

#### Get Fiat Wallet Summary
```
GET /api/demo-wallet/fiat/summary?userId=<uuid>
Returns: { enabled: boolean, summary: { totalNgn, availableNgn, lockedNgn, ... } }
```

#### Get Combined Wallet Summary (Demo + Fiat)
```
GET /api/demo-wallet/combined-summary?userId=<uuid>
Returns: { demo: {...}, fiat: {...}, fiatEnabled: boolean }
```

#### Create Withdrawal Request
```
POST /api/v2/fiat/withdrawals
Body: { amountNgn: number, userId: string, bankCode: string, accountNumber: string, accountName?: string }
```

#### List User Withdrawals
```
GET /api/v2/fiat/withdrawals?userId=<uuid>
```

#### Cancel Withdrawal
```
POST /api/v2/fiat/withdrawals/:id/cancel
Body: { userId: string }
```

### Admin Endpoints (Requires Admin Key)

#### List Withdrawal Requests
```
GET /api/v2/admin/withdrawals?status=requested&limit=50&offset=0
Headers: X-Admin-Key: <admin-key>
```

#### Approve Withdrawal
```
POST /api/v2/admin/withdrawals/:id/approve
Body: { actorId: string }
Headers: X-Admin-Key: <admin-key>
```

#### Reject Withdrawal
```
POST /api/v2/admin/withdrawals/:id/reject
Body: { actorId: string, reason: string }
Headers: X-Admin-Key: <admin-key>
```

#### Mark Withdrawal as Paid (Manual)
```
POST /api/v2/admin/withdrawals/:id/mark-paid
Body: { actorId: string, reference?: string }
Headers: X-Admin-Key: <admin-key>
```

## Database Migration

Run the migration to create the `fiat_withdrawals` table:

```sql
-- Run this in Supabase SQL Editor
\i server/migrations/317_fiat_withdrawals_table.sql
```

Or manually execute the SQL from:
```
server/migrations/317_fiat_withdrawals_table.sql
```

## Testing Checklist

### Phase 7A - Deposits
- [ ] Set `FIAT_PAYSTACK_ENABLED=true` in server env
- [ ] Configure webhook URL in Paystack dashboard
- [ ] Configure callback URL in Paystack dashboard
- [ ] Test deposit initialization: User clicks "Deposit" → redirected to Paystack
- [ ] Complete payment on Paystack → verify callback redirect
- [ ] Check webhook received: Paystack sends `charge.success` event
- [ ] Verify fiat balance updated in wallet
- [ ] Verify transaction appears in activity feed

### Phase 7B - Staking with Fiat
- [ ] User has fiat balance > 0
- [ ] Place stake using fiat funding mode
- [ ] Verify available balance decreases, locked increases
- [ ] Cancel prediction → verify refund credited
- [ ] Settle prediction → verify winners paid, fees applied

### Phase 7C - Withdrawals
- [ ] Set `PAYSTACK_TRANSFER_ENABLED=true` (or false for manual)
- [ ] User creates withdrawal request
- [ ] Verify request appears in admin queue
- [ ] Admin approves → verify transfer initiated (if enabled)
- [ ] Check Paystack webhook for transfer success/failure
- [ ] Verify withdrawal status updates correctly

## Security Notes

1. **Never commit API keys** - Use environment variables only
2. **Webhook signature verification** - The webhook route verifies HMAC-SHA512 signatures
3. **Idempotency** - All operations use `external_ref` for idempotent retries
4. **Raw body parsing** - Webhook route uses `raw({ type: 'application/json' })` for signature verification

## Amount Handling

- **Storage**: All amounts stored in **kobo** (NGN * 100) for precision
- **Display**: Convert to NGN (kobo / 100) for UI
- **Minimums**:
  - Deposit: NGN 100
  - Withdrawal: NGN 200

## Troubleshooting

### Webhook Not Receiving Events
1. Check Paystack dashboard → Webhooks → Recent events
2. Verify webhook URL is correct and accessible
3. Check server logs for signature verification errors
4. Ensure `PAYSTACK_SECRET_KEY` matches the key used by Paystack

### Deposits Not Crediting
1. Check webhook logs: `[Paystack Webhook] Processing deposit...`
2. Verify `external_ref` idempotency (no duplicate transactions)
3. Check `wallet_transactions` table for deposit entries
4. Verify user has correct `userId` in Paystack metadata

### Withdrawals Not Processing
1. Check `PAYSTACK_TRANSFER_ENABLED` flag
2. Verify Paystack recipient creation succeeded
3. Check transfer initiation logs
4. Review withdrawal status in `fiat_withdrawals` table

## Support

For Paystack API issues, refer to:
- [Paystack API Documentation](https://paystack.com/docs/api)
- [Paystack Webhooks Guide](https://paystack.com/docs/payments/webhooks)

For application issues, check server logs for:
- `[Paystack]` prefixed messages
- `[Withdrawals]` prefixed messages
- `[SETTLEMENT]` prefixed messages (for fiat settlement)
