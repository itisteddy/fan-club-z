# 🚀 Production Deployment Checklist

## Overview
This checklist ensures all environment variables, especially for crypto payments, are properly configured before deploying to production.

**Single runbook for Web + iOS + Android:** See **[DEPLOYMENT_READY.md](./DEPLOYMENT_READY.md)** for SQL step, Render/Vercel deploy, and iOS/Android build and upload.

---

## 📋 Pre-Deployment Checklist

### ✅ 1. Code Status
- [x] All changes committed
- [x] Recovery branch created: `recovery/fcz-latest-working`
- [x] Recovery tag created: `fcz-recovered-20251126-184209`
- [ ] Code reviewed and tested locally
- [ ] No hardcoded secrets or API keys in code

### ✅ 2. Database Setup (Supabase)
- [ ] Run migration **324** (Odds V2): `server/migrations/324_prediction_odds_model.sql` in SQL Editor (adds `predictions.odds_model`). Required only if enabling Odds V2; safe to run anytime.
- [ ] Verify `chain_addresses` table exists with production addresses
- [ ] Insert production contract addresses (Base Sepolia):
  ```sql
  -- Base Sepolia (Production - Testnet)
  INSERT INTO chain_addresses (env, chain_id, kind, address)
  VALUES 
    ('prod', 84532, 'usdc', '0x5B966ca41aB58E50056EE1711c9766Ca3382F115'), -- Base Sepolia USDC
    ('prod', 84532, 'escrow', '0xYourProduction_Escrow_Address')
  ON CONFLICT (env, chain_id, kind) DO UPDATE SET address=EXCLUDED.address;
  ```

---

## 🔐 Environment Variables Required

### **Vercel (Frontend - Main App)**

#### Required Variables:
```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# API Configuration
VITE_API_URL=https://fan-club-z.onrender.com
VITE_APP_URL=https://app.fanclubz.app

# WalletConnect (CRITICAL for crypto payments)
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Base Sepolia Configuration (Production - Testnet)
VITE_FCZ_BASE_ENABLE=1
VITE_FCZ_BASE_CHAIN_ID=84532
VITE_FCZ_BASE_READONLY=0
VITE_FCZ_BASE_DEPOSITS=1
VITE_FCZ_BASE_WITHDRAWALS=1
VITE_FCZ_BASE_BETS=1

# USDC Token (Base Sepolia)
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
VITE_USDC_DECIMALS=6

# Escrow Contract (Production)
VITE_BASE_ESCROW_ADDRESS=0xYourProduction_Escrow_Address

# Images Feature
VITE_IMAGES_FEATURE_FLAG=true

# OAuth Redirect
VITE_AUTH_REDIRECT_URL=https://app.fanclubz.app/auth/callback
```

#### Optional Variables:
```bash
# Coinbase Wallet (if enabled)
VITE_ENABLE_COINBASE_CONNECTOR=0

# Odds V2 (enable only if backend has FLAG_ODDS_V2=1 and migration 324 run)
VITE_FCZ_ODDS_V2=1

# Debug/Development
VITE_DEBUG_LOGS=false
VITE_DEBUG_WALLET=false
```

---

### **Render (Backend - API Server)**

#### Required Variables:
```bash
# Node Environment
NODE_ENV=production
PORT=3001

# Supabase (CRITICAL)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Frontend URL
CLIENT_URL=https://app.fanclubz.app
FRONTEND_URL=https://app.fanclubz.app
VITE_APP_URL=https://app.fanclubz.app

# API URL
API_URL=https://fan-club-z.onrender.com

# Payment System (CRITICAL for crypto)
PAYMENTS_ENABLE=1
RUNTIME_ENV=prod

# Base Sepolia Configuration (Production - Testnet)
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com
ENABLE_BASE_DEPOSITS=1
BASE_DEPOSITS_MOCK=0

# Contract Addresses (Base Sepolia)
USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115
BASE_ESCROW_ADDRESS=0xYourProduction_Escrow_Address

# Image APIs (for prediction images)
PEXELS_API_KEY=your_pexels_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Security
JWT_SECRET=your_minimum_32_character_jwt_secret_for_production
SESSION_SECRET=your_session_secret_for_production
CORS_ORIGINS=https://app.fanclubz.app,https://fanclubz.app

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Optional: Odds V2 (run migration 324 first)
FLAG_ODDS_V2=1
```

---

### **Vercel (Landing Page)**

#### Required Variables:
```bash
# Supabase (if landing page uses auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# App URL
VITE_APP_URL=https://app.fanclubz.app
```

---

## 🔍 Critical Crypto Payment Variables

These MUST be set correctly for crypto payments to work:

### Frontend (Vercel):
1. ✅ `VITE_WALLETCONNECT_PROJECT_ID` - Get from https://cloud.reown.com
2. ✅ `VITE_BASE_ESCROW_ADDRESS` - Your deployed escrow contract address
3. ✅ `VITE_FCZ_BASE_CHAIN_ID=84532` - Base Sepolia (testnet)
4. ✅ `VITE_USDC_ADDRESS_BASE_SEPOLIA=0x5B966ca41aB58E50056EE1711c9766Ca3382F115` - Base Sepolia USDC address

### Backend (Render):
1. ✅ `PAYMENTS_ENABLE=1` - Enables payment system
2. ✅ `RUNTIME_ENV=prod` - Uses production contract addresses from database
3. ✅ `CHAIN_ID=84532` - Base Sepolia (testnet)
4. ✅ `USDC_ADDRESS=0x5B966ca41aB58E50056EE1711c9766Ca3382F115` - Base Sepolia USDC address
5. ✅ `BASE_ESCROW_ADDRESS` - Your deployed escrow contract
6. ✅ `ENABLE_BASE_DEPOSITS=1` - Enables deposit watcher
7. ✅ `BASE_DEPOSITS_MOCK=0` - Uses real blockchain (not mock)

---

## 📝 Deployment Steps

### Step 1: Verify Environment Variables

#### Vercel (Main App):
1. Go to: https://vercel.com/dashboard
2. Select your project: `fan-club-z` (or main app project)
3. Go to **Settings** → **Environment Variables**
4. Verify all variables from the checklist above are set
5. **CRITICAL**: Ensure `VITE_WALLETCONNECT_PROJECT_ID` is set and domain is whitelisted at https://cloud.reown.com

#### Render (Backend):
1. Go to: https://dashboard.render.com
2. Select your service: `fan-club-z`
3. Go to **Environment** tab
4. Verify all variables from the checklist above are set
5. **CRITICAL**: Ensure `PAYMENTS_ENABLE=1` and `RUNTIME_ENV=prod`

#### Vercel (Landing Page):
1. Go to: https://vercel.com/dashboard
2. Select your landing page project
3. Go to **Settings** → **Environment Variables**
4. Verify variables are set

---

### Step 2: Deploy Backend (Render)

1. **Push to main branch:**
   ```bash
   git checkout main
   git merge feat/homepage-authguard-copy
   git push origin main
   ```

2. **Render will auto-deploy** from main branch

3. **Verify deployment:**
   - Check Render dashboard for successful build
   - Test health endpoint: `https://fan-club-z.onrender.com/health`
   - Test payments health: `https://fan-club-z.onrender.com/health/payments`

---

### Step 3: Deploy Frontend (Vercel - Main App)

1. **Push to main branch** (if not already done)

2. **Vercel will auto-deploy** from main branch

3. **Verify deployment:**
   - Check Vercel dashboard for successful build
   - Visit: `https://app.fanclubz.app`
   - Test wallet connection
   - Test deposit/withdraw flows

---

### Step 4: Deploy Landing Page (Vercel)

1. **Navigate to landing page directory:**
   ```bash
   cd landing-page
   ```

2. **Push to main branch** (if separate repo) or trigger Vercel deployment

3. **Verify deployment:**
   - Visit landing page URL
   - Test navigation to main app

---

## ✅ Post-Deployment Verification

### 1. Crypto Payment Functionality

- [ ] Wallet connects successfully
- [ ] Can view wallet balance
- [ ] Can deposit USDC (test with small amount)
- [ ] Deposit appears in activity feed
- [ ] Can withdraw USDC (if available balance)
- [ ] Withdrawal appears in activity feed
- [ ] Can place bets on predictions
- [ ] Bet transactions appear in activity feed

### 2. General Functionality

- [ ] User authentication works
- [ ] Predictions load correctly
- [ ] Images load on prediction cards
- [ ] Can create predictions
- [ ] Can place bets
- [ ] Activity feed updates
- [ ] Profile page works

### 3. Performance

- [ ] Page load times are acceptable
- [ ] No console errors
- [ ] Images load properly
- [ ] No excessive re-renders

---

## 🚨 Common Issues & Solutions

### Issue: Wallet won't connect
- **Solution**: Verify `VITE_WALLETCONNECT_PROJECT_ID` is set and domain is whitelisted at https://cloud.reown.com

### Issue: Deposits not appearing
- **Solution**: 
  1. Check `PAYMENTS_ENABLE=1` on Render
  2. Check `RUNTIME_ENV=prod` on Render
  3. Verify contract addresses in `chain_addresses` table
  4. Check Render logs for deposit watcher errors

### Issue: Wrong network/chain
- **Solution**: Verify `VITE_FCZ_BASE_CHAIN_ID=84532` (Base Sepolia) on Vercel

### Issue: Images not loading
- **Solution**: Verify `PEXELS_API_KEY` and `UNSPLASH_ACCESS_KEY` are set on Render

---

## 📞 Support

If you encounter issues:
1. Check Render logs: https://dashboard.render.com
2. Check Vercel logs: https://vercel.com/dashboard
3. Check Supabase logs: https://supabase.com/dashboard
4. Review browser console for errors
5. Verify all environment variables are set correctly

---

## ⚠️ IMPORTANT NOTES

1. **Never commit `.env` files** to git
2. **Always use production contract addresses** for production deployment
3. **Base Sepolia chain ID is 84532** (testnet - using in production)
4. **WalletConnect domain must be whitelisted** at https://cloud.reown.com
5. **Test with small amounts first** before large transactions
6. **Note**: Using Base Sepolia (testnet) in production - ensure users understand this is testnet USDC

---

**Last Updated**: 2025-11-26
**Recovery Tag**: `fcz-recovered-20251126-184209`

