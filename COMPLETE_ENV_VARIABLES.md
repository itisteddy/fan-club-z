# Complete Environment Variables Reference

## 📋 Overview

This document lists **ALL** environment variables used in Fan Club Z, organized by:
- **Render (Backend)** - Server-side variables
- **Vercel (Frontend)** - Client-side variables (must start with `VITE_`)

---

## 🔴 Render (Backend) - Complete List

### **🔐 Critical - Required for Production**

```bash
# Supabase Database
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://auth.fanclubz.app
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (Alternative)
DATABASE_URL=postgresql://...
SUPABASE_DB_URL=postgresql://...
PGHOST=aws-0-us-east-2.pooler.supabase.com
PGPORT=6543
PGUSER=postgres.xxx
PGPASSWORD=xxx
PGDATABASE=postgres
PGSSLMODE=require
```

### **🔗 Blockchain Configuration (Base Sepolia)**

```bash
# Chain Configuration
CHAIN_ID=84532
RPC_URL=https://sepolia.base.org
RPC_WS_URL=wss://base-sepolia-rpc.publicnode.com

# Contract Addresses
BASE_ESCROW_ADDRESS=0x7B657F5140635241aec55f547d10F31cBDdF3105
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Payment System
PAYMENTS_ENABLE=1
ENABLE_BASE_DEPOSITS=1
ENABLE_BASE_BETS=1
BASE_DEPOSITS_MOCK=0
RUNTIME_ENV=prod
```

### **⚙️ Admin & Relayer (NEW - Phase 4)**

```bash
# Admin API Key (for securing admin endpoints)
ADMIN_API_KEY=d394d9f33e91823fc61979c73cd36f04c8fdd513fd5e704b6f6516437a5f1d31

# Relayer Configuration (for admin on-chain finalization)
RELAYER_PRIVATE_KEY=0x6ec89140ebd7ae8f7bbae4d120d841883b1a9348fc0491bc06bf618d7f1c608b
RELAYER_RPC_URL=https://sepolia.base.org
RELAYER_CHAIN_ID=84532
```

### **🌐 Server Configuration**

```bash
# Server Settings
PORT=10000
NODE_ENV=production
TRUST_PROXY=true

# URLs
CLIENT_URL=https://app.fanclubz.app
FRONTEND_URL=https://app.fanclubz.app
API_URL=https://fan-club-z.onrender.com

# CORS (comma-separated)
CORS_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://www.fanclubz.app,https://fan-club-z.onrender.com
```

### **🔒 Security & Authentication**

```bash
# JWT Configuration
JWT_SECRET=sDrK8jUKE/Tys73gKROTAQipav7bHB4IT9x+5SFht1aQUOfkxKsIKw3y7XvDax5/Nof5fiz+iBblq5oDq0bsJg==
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Session
SESSION_SECRET=FanClubZ-Production-Session-Secret-2025-Secure-Random-String

# Security
BCRYPT_ROUNDS=12
```

### **📊 Rate Limiting & Performance**

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Cache
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# Database Pool
DB_MAX_CONNECTIONS=10
DB_CONNECTION_TIMEOUT=10000
```

### **🎨 Content & Media**

```bash
# Image APIs
PEXELS_API_KEY=MNVZGjhI06B65Il9QFX2GVU9D3nHftQzMZhMcWVNICUQtrKYbf4JoSKf
UNSPLASH_ACCESS_KEY=KoLAbON534ZA8GNcNdZGTEoDtNBarlgJArGSokyuGkI
```

### **🚩 Feature Flags**

```bash
# Feature Toggles
ENABLE_SOCIAL_FEATURES=true
ENABLE_CLUBS=true
ENABLE_REAL_TIME=true
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_ANALYTICS=false
ENABLE_BLOCKCHAIN=True
ENABLE_WEBSOCKET=true
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=false
```

### **💰 Payment Configuration**

```bash
# Demo Mode (can be enabled in production if desired)
PAYMENT_DEMO_MODE=true  # Backend: enables demo payment processing (defaults to true if not set)
DEMO_PAYMENT_SUCCESS_RATE=0.9
DEMO_PAYMENT_DELAY=3000

# Platform Treasury
PLATFORM_TREASURY_USER_ID=<uuid>
PLATFORM_FEE_CURRENCY=USD
```

### **📧 Email (Optional)**

```bash
# Email Provider
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SENDGRID_API_KEY=<optional>

# Email From
EMAIL_FROM_NAME=Fan Club Z
EMAIL_FROM_ADDRESS=noreply@fanclubz.com
```

### **📝 Logging**

```bash
LOG_LEVEL=info
ENABLE_CONSOLE_LOGGING=true
ENABLE_FILE_LOGGING=false
LOG_MAX_FILES=5
LOG_MAX_SIZE=10m
```

### **🔗 WebSocket**

```bash
WEBSOCKET_ORIGINS=https://dev.fanclubz.app,https://app.fanclubz.app,https://fanclubz.app,https://fan-club-z.onrender.com
```

### **🎁 Referrals**

```bash
REFERRAL_ENABLE=1
REFERRAL_MAX_SIGNUPS_PER_DEVICE_DAY=5
REFERRAL_MAX_SIGNUPS_PER_IP_DAY=10
```

### **🏆 Badges**

```bash
BADGES_OG_ENABLE=1
BADGES_OG_COUNTS=25,100,500
```

---

## 🔵 Vercel (Frontend) - Complete List

### **🔐 Critical - Required**

```bash
# Supabase
VITE_SUPABASE_URL=https://auth.fanclubz.app
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Configuration
VITE_API_URL=https://fan-club-z.onrender.com
VITE_APP_URL=https://app.fanclubz.app
```

### **🔗 Blockchain Configuration**

```bash
# Base Sepolia
VITE_FCZ_BASE_CHAIN_ID=84532
VITE_BASE_ESCROW_ADDRESS=0x7B657F5140635241aec55f547d10F31cBDdF3105
VITE_USDC_ADDRESS_BASE_SEPOLIA=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_USDC_DECIMALS=6

# Legacy (for compatibility)
VITE_BASE_USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
VITE_PLATFORM_TREASURY_ADDRESS=0x80f204ea1b41f08227b87334e1384e5687f332d2
```

### **🔌 WalletConnect**

```bash
VITE_WALLETCONNECT_PROJECT_ID=00bf3e007580babfff66bd23c646f3ff
```

### **🚩 Feature Flags (Optional)**

```bash
# Demo Credits (set to 1 to enable demo mode toggle - can be used in production)
VITE_FCZ_ENABLE_DEMO=1  # Frontend: enables demo/crypto mode toggle in UI (defaults to demo when enabled)

# Other Feature Flags
VITE_FCZ_UNIFIED_HEADER=1
VITE_FCZ_UNIFIED_CARDS=1
VITE_FCZ_AUTH_GATE=1
VITE_FCZ_COMMENTS_V2=1
```

---

## 📊 Environment Variables Summary Table

| Variable | Render | Vercel | Required | Description |
|----------|--------|--------|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | ✅ | Supabase service role key |
| `VITE_SUPABASE_URL` | ✅ | ✅ | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | Supabase anonymous key |
| `CHAIN_ID` | ✅ | ❌ | ✅ | Blockchain chain ID (84532) |
| `RPC_URL` | ✅ | ❌ | ✅ | RPC endpoint URL |
| `BASE_ESCROW_ADDRESS` | ✅ | ❌ | ✅ | Escrow contract address |
| `VITE_BASE_ESCROW_ADDRESS` | ❌ | ✅ | ✅ | Escrow contract (client) |
| `USDC_ADDRESS` | ✅ | ❌ | ✅ | USDC token address |
| `VITE_USDC_ADDRESS_BASE_SEPOLIA` | ❌ | ✅ | ✅ | USDC token (client) |
| `RELAYER_PRIVATE_KEY` | ✅ | ❌ | ✅ | Admin relayer wallet key |
| `RELAYER_RPC_URL` | ✅ | ❌ | ✅ | Relayer RPC URL |
| `RELAYER_CHAIN_ID` | ✅ | ❌ | ✅ | Relayer chain ID |
| `ADMIN_API_KEY` | ✅ | ❌ | ✅ | Admin API key |
| `VITE_WALLETCONNECT_PROJECT_ID` | ❌ | ✅ | ✅ | WalletConnect project ID |
| `PEXELS_API_KEY` | ✅ | ❌ | ⚠️ | Image API key |
| `UNSPLASH_ACCESS_KEY` | ✅ | ❌ | ⚠️ | Image API key |
| `PAYMENT_DEMO_MODE` | ✅ | ❌ | ⚠️ | Demo mode flag (true to enable, false to disable) |
| `VITE_FCZ_ENABLE_DEMO` | ❌ | ✅ | ⚠️ | Enable demo credits toggle (1 to enable, 0/omit to disable) |

---

## 🔍 Verification Checklist

### **Render Dashboard:**
- [ ] All critical variables set
- [ ] Relayer variables configured
- [ ] Admin API key set
- [ ] Blockchain addresses correct
- [ ] CORS origins configured

### **Vercel Dashboard:**
- [ ] Supabase variables set
- [ ] API URL configured
- [ ] Blockchain addresses set
- [ ] WalletConnect project ID set

---

## 🚨 Common Issues

1. **Missing `VITE_` prefix**: Frontend variables MUST start with `VITE_` to be exposed to client
2. **Wrong chain ID**: Ensure `CHAIN_ID=84532` for Base Sepolia
3. **CORS errors**: Verify `CORS_ORIGINS` includes your domain
4. **Relayer not working**: Check `RELAYER_PRIVATE_KEY` has ETH for gas

---

## 📝 Notes

- Variables without `VITE_` prefix are **server-only** and not exposed to client
- All `VITE_*` variables are **public** and visible in client-side code
- Never commit `.env` files to git
- Rotate secrets regularly
- Use strong, random values for security-critical variables

## 🎮 Demo Credits Configuration

**To Enable Demo Credits (Local Dev or Production):**
```bash
# Vercel (Frontend) - Enable demo mode toggle
VITE_FCZ_ENABLE_DEMO=1

# Render (Backend) - Enable demo payment processing
PAYMENT_DEMO_MODE=true  # or omit (defaults to true)
```

**To Disable Demo Credits:**
```bash
# Vercel (Frontend) - Disable demo mode toggle
VITE_FCZ_ENABLE_DEMO=0  # or omit entirely

# Render (Backend) - Disable demo payment processing
PAYMENT_DEMO_MODE=false
```

**How Demo Credits Work:**
- When `VITE_FCZ_ENABLE_DEMO=1`, users can toggle between "Demo" and "Crypto" funding modes
- **Default mode is "Demo Credits"** when demo is enabled (users can switch to crypto if needed)
- Demo credits are stored in `wallets` table with `currency='DEMO_USD'` and `provider='demo-wallet'`
- Users can request demo credits via `/api/demo-wallet/faucet` endpoint (50 DEMO_USD per day)
- Demo bets are settled instantly off-chain (no on-chain transactions)
- Demo credits can be enabled in **both local development and production** environments

